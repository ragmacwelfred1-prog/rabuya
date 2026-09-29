<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ParkingRemittance;
use App\Models\ParkingPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\API\NotificationController; // Added import

class ParkingRemittanceController extends Controller
{
   
    public function checkToday()
    {
        $staffId = Auth::id();
        $today   = now()->toDateString();

        $remittance = ParkingRemittance::where('staff_id', $staffId)
            ->where('remittance_date', $today)
            ->first();

        return response()->json([
            'exists'     => ! is_null($remittance),
            'remittance' => $remittance,
        ]);
    }

    
    public function getTodaySalesTotal()
    {
        $staffId = Auth::id();
        $today   = now()->toDateString();

        $total = ParkingPayment::where('status', 'paid')
            ->where('processed_by', $staffId)
            ->whereDate('created_at', $today)
            ->whereHas('transaction.booking', function ($q) {
                $q->where('booking_type', 'walk_in');
            })
            ->sum('amount_paid');

        return response()->json([
            'actual_sales_amount' => round((float) $total, 2),
        ]);
    }


    public function store(Request $request)
{
    $request->validate([
        'remitted_amount' => 'required|numeric|min:0',
    ]);

    $staffId = Auth::id();
    $today   = now()->toDateString();

    $existing = ParkingRemittance::where('staff_id', $staffId)
        ->where('remittance_date', $today)
        ->first();

    // Block only when the existing remittance is NOT rejected
    if ($existing && $existing->status !== 'rejected') {
        return response()->json([
            'message' => 'You have already submitted a parking remittance for today.',
        ], 422);
    }

    // Compute actual sales from walk-in parking payments processed by this staff
    $actual = ParkingPayment::where('status', 'paid')
        ->where('processed_by', $staffId)
        ->whereDate('created_at', $today)
        ->whereHas('transaction.booking', function ($q) {
            $q->where('booking_type', 'walk_in');
        })
        ->sum('amount_paid');

    if ($existing) {
        // Reuse the rejected row so the unique constraint is satisfied.
        // This preserves the audit trail (the previous rejection info is
        // still visible in the admin review log if you keep history there).
        $existing->update([
            'remitted_amount'     => round((float) $request->remitted_amount, 2),
            'actual_sales_amount' => round((float) $actual, 2),
            'status'              => 'pending',
            'reviewed_at'         => null,
        ]);

        return response()->json([
            'message'    => 'Parking remittance resubmitted successfully.',
            'remittance' => $existing->fresh(),
        ], 200);
    }

    $remittance = ParkingRemittance::create([
        'staff_id'            => $staffId,
        'remittance_date'     => $today,
        'remitted_amount'     => round((float) $request->remitted_amount, 2),
        'actual_sales_amount' => round((float) $actual, 2),
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