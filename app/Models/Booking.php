<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    protected $table = 'bookings';

    protected $fillable = [
        'customer_id',
        'vehicle_id',
        'parking_slot_id',
        'check_in_date',
        'check_out_date',
        'status',
        'booking_type',
        'confirm_by_id',
        'promo_id',
    ];

    protected $casts = [
        'check_in_date'  => 'datetime',
        'check_out_date' => 'datetime',
        'status'         => 'string',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function parkingSlot(): BelongsTo
    {
        return $this->belongsTo(ParkingSlot::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirm_by_id');
    }

    public function transaction()
    {
        return $this->hasOne(ParkingTransaction::class);
    }

    public function promo(): BelongsTo
    {
        return $this->belongsTo(Promo::class, 'promo_id');
    }

   
    public function downpayment(): HasOne
    {
        return $this->hasOne(ParkingPayment::class, 'booking_id')
            ->where('payment_method', 'gcash')
            ->whereNull('parking_transaction_id') 
            ->latestOfMany();
    }

    // ─── Status helpers ───────────────────────────────────────────────────────

    public function isPending():   bool { return $this->status === 'pending'; }
    public function isApproved():  bool { return $this->status === 'approved'; }
    public function isRejected():  bool { return $this->status === 'rejected'; }
    public function isCompleted(): bool { return $this->status === 'completed'; }
    public function isCancelled(): bool { return $this->status === 'cancelled'; }

    public function approve(int $confirmedById): void
    {
        $this->update(['status' => 'approved', 'confirm_by_id' => $confirmedById]);
    }

    public function reject():   void { $this->update(['status' => 'rejected']); }
    public function complete(): void { $this->update(['status' => 'completed']); }
    public function cancel():   void { $this->update(['status' => 'cancelled']); }
}