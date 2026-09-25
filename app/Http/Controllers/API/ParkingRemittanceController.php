<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ParkingRemittance;
use App\Models\ParkingPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

        // Prevent duplicate submission
        $existing = ParkingRemittance::where('staff_id', $staffId)
            ->where('remittance_date', $today)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You have already submitted a parking remittance for today.',
            ], 422);
        }

        // Compute actual collections
        $actual = ParkingPayment::where('status', 'paid')
            ->where('processed_by', $staffId)
            ->whereDate('created_at', $today)
            ->whereHas('transaction.booking', function ($q) {
                $q->where('booking_type', 'walk_in');
            })
            ->sum('amount_paid');

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

        return response()->json([
            'message'    => "Remittance {$request->status}.",
            'remittance' => $remittance->fresh('staff'),
        ]);
    }
}