<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\FuelRemittance;
use App\Models\FuelSale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FuelRemittanceController extends Controller
{
    
    public function checkToday()
    {
        $staffId = Auth::id();
        $today = now()->toDateString();

        $remittance = FuelRemittance::where('staff_id', $staffId)
            ->where('remittance_date', $today)
            ->first();

        return response()->json([
            'exists' => !is_null($remittance),
            'remittance' => $remittance,
        ]);
    }

    
    public function getTodaySalesTotal()
    {
        $staffId = Auth::id();
        $today = now()->toDateString();

        $total = FuelSale::where('recorded_by', $staffId)
            ->whereDate('sale_date', $today)
            ->sum(DB::raw('liters_sold * price_per_liter'));

        return response()->json([
            'actual_sales_amount' => round($total, 2),
        ]);
    }

   
    public function store(Request $request)
    {
        $request->validate([
            'remitted_amount' => 'required|numeric|min:0',
        ]);

        $staffId = Auth::id();
        $today = now()->toDateString();

        // Check if already remitted today
        $existing = FuelRemittance::where('staff_id', $staffId)
            ->where('remittance_date', $today)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You have already submitted a remittance for today.',
            ], 422);
        }

        // Compute actual sales
        $actual = FuelSale::where('recorded_by', $staffId)
            ->whereDate('sale_date', $today)
            ->sum(DB::raw('liters_sold * price_per_liter'));

        $remittance = FuelRemittance::create([
            'staff_id' => $staffId,
            'remittance_date' => $today,
            'remitted_amount' => round($request->remitted_amount, 2),
            'actual_sales_amount' => round($actual, 2),
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Remittance submitted successfully.',
            'remittance' => $remittance,
        ]);
    }

    
    public function index(Request $request)
    {
        $query = FuelRemittance::with('staff');

        if ($request->has('status') && in_array($request->status, ['pending', 'approved', 'rejected'])) {
            $query->where('status', $request->status);
        }

        if ($request->has('staff_id')) {
            $query->where('staff_id', $request->staff_id);
        }

        if ($request->has('date_from')) {
            $query->where('remittance_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('remittance_date', '<=', $request->date_to);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

   
    public function show($id)
    {
        $remittance = FuelRemittance::with('staff')->findOrFail($id);
        return response()->json($remittance);
    }

   
    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
        ]);

        $remittance = FuelRemittance::findOrFail($id);

        if ($remittance->status !== 'pending') {
            return response()->json([
                'message' => 'This remittance has already been reviewed.',
            ], 422);
        }

        $remittance->update([
            'status' => $request->status,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => "Remittance {$request->status}.",
            'remittance' => $remittance,
        ]);
    }
}