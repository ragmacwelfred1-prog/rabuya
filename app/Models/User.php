<?php
// app/Models/User.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'email',
        'password',
        'first_name',
        'middle_name',
        'last_name',
        'phone_number',
        'address',
        'role',
        'customer_type',
        'employee_id',
        'is_active',
        'email_verified',
        'license_number',
        'license_type',
        'license_expiration',
        'license_photo',
        'license_photo_original_name',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'is_active' => 'boolean',
        'email_verified' => 'boolean',
        'license_expiration' => 'date',
    ];

    // ─── Role helpers ─────────────────────────────────────────────────────────

    public function isAdmin(): bool { return $this->role === 'admin'; }
    public function isStaff(): bool { return $this->role === 'staff'; }
    public function isCustomer(): bool { return $this->role === 'customer'; }

    // ─── Accessors ────────────────────────────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return collect([$this->first_name, $this->middle_name, $this->last_name])
            ->filter()
            ->implode(' ');
    }

    public function getLicensePhotoUrlAttribute(): ?string
    {
        if ($this->license_photo) {
            return asset('storage/' . $this->license_photo);
        }
        return null;
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function vehicles() { return $this->hasMany(Vehicle::class, 'customer_id'); }
    public function bookings() { return $this->hasMany(Booking::class, 'customer_id'); }
    public function confirmedBookings() { return $this->hasMany(Booking::class, 'confirm_by_id'); }
    public function otpCodes() { return $this->hasMany(OtpCode::class); }

    // ─── OTP helpers ──────────────────────────────────────────────────────────

    public function latestValidOtp(): ?OtpCode
    {
        return $this->otpCodes()
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();
    }

    public function issueOtp(): OtpCode
    {
        $this->otpCodes()->where('is_used', false)->update(['is_used' => true]);

        return $this->otpCodes()->create([
            'otp_code'   => str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT),
            'expires_at' => now()->addMinutes(10),
            'is_used'    => false,
        ]);
    }
}