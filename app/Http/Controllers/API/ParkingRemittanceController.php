<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ParkingRemittance;
use App\Models\ParkingPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\API\NotificationController;

class ParkingRemittanceController extends Controller
{
    /**
     * Compute today's net cash collection for a staff member.
     * Net = amount_paid - change_amount (excludes GCash/online payments)
     */
    private function computeTodayCollection(int $staffId): float
    {
        $total = ParkingPayment::where('status', 'paid')
            ->where('processed_by', $staffId)
            ->where('payment_method', 'cash')
            ->whereNotNull('parking_transaction_id')   // exclude GCash downpayment rows
            ->whereDate('created_at', now()->toDateString())
            ->sum(DB::raw('amount_paid - change_amount'));

        return round(max(0, (float) $total), 2);
    }

    /**
     * Return today's remittance row for the logged-in staff.
     * The row is reused/accumulated across partial submissions,
     * so there is exactly ONE row per (staff_id, remittance_date).
     */
    public function checkToday()
    {
        $staffId = Auth::id();
        $today   = now()->toDateString();

        $remittance = ParkingRemittance::where('staff_id', $staffId)
            ->where('remittance_date', $today)
            ->orderByDesc('updated_at')
            ->first();

        return response()->json([
            'exists'     => ! is_null($remittance),
            'remittance' => $remittance,
        ]);
    }

    public function getTodaySalesTotal()
    {
        return response()->json([
            'actual_sales_amount' => $this->computeTodayCollection(Auth::id()),
        ]);
    }

    /**
     * Submit a (possibly partial) remittance.
     *
     * Rules:
     *  - Cannot remit while a PENDING remittance is awaiting review.
     *  - Cannot remit more than today's total collection.
     *  - Cannot remit more than the REMAINING (actual - alreadyRemitted).
     *  - If a row exists (approved or rejected), it is reused and
     *    remitted_amount is ACCUMULATED (approved portion + new amount).
     */
    public function store(Request $request)
    {
        $request->validate([
            'remitted_amount' => 'required|numeric|min:0.01',
        ]);

        $staffId  = Auth::id();
        $today    = now()->toDateString();
        $actual   = $this->computeTodayCollection($staffId);
        $newAmount = round((float) $request->remitted_amount, 2);

        $existing = ParkingRemittance::where('staff_id', $staffId)
            ->where('remittance_date', $today)
            ->first();

        // 1. Block if a PENDING remittance is awaiting review
        if ($existing && $existing->status === 'pending') {
            return response()->json([
                'message' => 'You have a pending parking remittance awaiting review.',
            ], 422);
        }

        // 2. Cannot exceed today's total collection
        if ($newAmount > $actual + 0.01) {
            return response()->json([
                'message' => 'You cannot remit more than today\'s total collection.',
            ], 422);
        }

        // 3. Compute remaining based on what has been APPROVED so far
        $alreadyApproved = 0.0;
        if ($existing && $existing->status === 'approved') {
            $alreadyApproved = (float) $existing->remitted_amount;
        }
        $remaining = round(max(0, $actual - $alreadyApproved), 2);

        if ($newAmount > $remaining + 0.01) {
            return response()->json([
                'message' => 'Only ₱' . number_format($remaining, 2)
                           . ' remains to be remitted.',
            ], 422);
        }

        // 4. Reuse existing row (approved or rejected) and accumulate
        if ($existing) {
            $existing->update([
                'remitted_amount'     => round($alreadyApproved + $newAmount, 2),
                'actual_sales_amount' => $actual,
                'status'              => 'pending',
                'reviewed_at'         => null,
            ]);

            return response()->json([
                'message'    => 'Parking remittance submitted successfully.',
                'remittance' => $existing->fresh(),
            ], 200);
        }

        // 5. First submission of the day
        $remittance = ParkingRemittance::create([
            'staff_id'            => $staffId,
            'remittance_date'     => $today,
            'remitted_amount'     => $newAmount,
            'actual_sales_amount' => $actual,
            'status'              => 'pending',
        ]);

        return response()->json([
            'message'    => 'Parking remittance submitted successfully.',
            'remittance' => $remittance,
        ], 201);
    }

    public function index(Request $request)
    {
        $query = ParkingRemittance::with('staff');

        if ($request->filled('status') && in_array($request->status, ['pending', 'approved', 'rejected'])) {
            $query->where('status', $request->status);
        }

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->staff_id);
        }

        if ($request->filled('date_from')) {
            $query->where('remittance_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('remittance_date', '<=', $request->date_to);
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->get()
        );
    }

    public function show($id)
    {
        return response()->json(
            ParkingRemittance::with('staff')->findOrFail($id)
        );
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
        ]);

        $remittance = ParkingRemittance::findOrFail($id);

        if ($remittance->status !== 'pending') {
            return response()->json([
                'message' => 'This remittance has already been reviewed.',
            ], 422);
        }

        $remittance->update([
            'status'      => $request->status,
            'reviewed_at' => now(),
        ]);

        // Trigger notification for the staff
        $this->notifyStaff($remittance, $request->status, 'Parking', '/(staff)/parking-remittance');

        return response()->json([
            'message'    => "Remittance {$request->status}.",
            'remittance' => $remittance->fresh('staff'),
        ]);
    }

    /**
     * Send notification to staff regarding remittance status.
     */
    private function notifyStaff(ParkingRemittance $r, string $status, string $label, string $route): void
    {
        $remitted = (float) $r->remitted_amount;
        $actual   = (float) $r->actual_sales_amount;
        $diff     = round($remitted - $actual, 2);   // + = sobra, - = kulang
        $date     = \Carbon\Carbon::parse($r->remittance_date)->format('M d, Y');

        if (abs($diff) < 0.01) {
            $variance = 'exact';
            $varianceText = 'Exact match ✓';
        } elseif ($diff > 0) {
            $variance = 'over';
            $varianceText = 'SOBRA ng ₱' . number_format($diff, 2);
        } else {
            $variance = 'short';
            $varianceText = 'KULANG ng ₱' . number_format(abs($diff), 2);
        }

        if ($status === 'rejected') {
            $title = "❌ {$label} Remittance Rejected";
            $type  = 'error';
            $msg   = "Ang {$label} remittance mo para sa {$date} ay na-reject. {$varianceText}.";
        } elseif ($variance === 'exact') {
            $title = "✅ {$label} Remittance Approved";
            $type  = 'success';
            $msg   = "Na-approve ang {$label} remittance mo para sa {$date}. {$varianceText}.";
        } else {
            $title = "⚠️ {$label} Remittance Approved — {$varianceText}";
            $type  = 'warning';
            $msg   = "Na-approve ang remittance mo para sa {$date}, pero {$varianceText}. "
                   . "Remitted: ₱" . number_format($remitted, 2)
                   . " | Actual: ₱" . number_format($actual, 2) . ".";
        }

        NotificationController::createNotification(
            $r->staff_id,
            $title,
            $msg,
            $type,
            [
                'remittance_id'  => $r->id,
                'category'       => 'remittance',
                'priority'       => $variance === 'exact' && $status === 'approved' ? 'medium' : 'high',
                'variance'       => $variance,
                'difference'     => $diff,
                'remitted'       => $remitted,
                'actual'         => $actual,
                'action'         => ['label' => 'View', 'route' => $route],
            ]
        );
    }
}