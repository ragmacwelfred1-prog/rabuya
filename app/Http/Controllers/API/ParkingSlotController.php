<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ParkingSlot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ParkingSlotController extends Controller
{
    public function index()
    {
        try {
            $slots = ParkingSlot::orderBy('slot_number', 'asc')->get();
            return response()->json($slots);
        } catch (\Exception $e) {
            Log::error('Index error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch parking slots'], 500);
        }
    }
    
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'slot_number' => 'required|string|unique:parking_slots,slot_number',
                'nightly_rate' => 'required|numeric|min:0',
                'status' => 'required|in:available,occupied,maintenance'
            ]);
            
            $slot = ParkingSlot::create($validated);
            return response()->json($slot, 201);
        } catch (\Exception $e) {
            Log::error('Store error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
    
    public function update(Request $request, $id)
    {
        try {
            $slot = ParkingSlot::findOrFail($id);
            
            $validated = $request->validate([
                'slot_number' => 'sometimes|string|unique:parking_slots,slot_number,' . $id,
                'nightly_rate' => 'sometimes|numeric|min:0',
                'status' => 'sometimes|in:available,occupied,maintenance'
            ]);
            
            $slot->update($validated);
            return response()->json($slot);
        } catch (\Exception $e) {
            Log::error('Update error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
    
    public function destroy($id)
    {
        try {
            $slot = ParkingSlot::findOrFail($id);
            
            // Prevent deleting occupied slots
            if ($slot->status === 'occupied') {
                return response()->json(['message' => 'Cannot delete occupied slot'], 422);
            }
            
            $slot->delete();
            return response()->json(['message' => 'Slot deleted']);
        } catch (\Exception $e) {
            Log::error('Destroy error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
    
    public function getAvailable()
    {
        try {
            $slots = ParkingSlot::where('status', 'available')
                ->orderBy('slot_number', 'asc')
                ->get();
            return response()->json($slots);
        } catch (\Exception $e) {
            Log::error('Get available error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch available slots'], 500);
        }
    }
}
