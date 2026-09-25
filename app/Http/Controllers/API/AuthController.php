<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Mail\OtpMail;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    // ============================================
    // ADMIN LOGIN
    // ============================================
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->where('is_active', true)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Admin access only'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success'   => true,
            'user'      => [
                'id'         => $user->id,
                'first_name' => $user->first_name,
                'last_name'  => $user->last_name,
                'email'      => $user->email,
                'role'       => $user->role,
            ],
            'token'     => $token,
            'user_type' => 'admin',
        ]);
    }

    // ============================================
    // STAFF LOGIN
    // ============================================
    public function staffLogin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->where('is_active', true)->first();

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Account not found'], 401);
        }

        if (! in_array($user->role, ['staff', 'admin'])) {
            return response()->json(['success' => false, 'message' => 'Staff access only'], 403);
        }

        if (! Hash::check($request->password, $user->password)) {
            return response()->json(['success' => false, 'message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('staff-token')->plainTextToken;

        Log::info('Staff login successful', ['user_id' => $user->id, 'role' => $user->role]);

        return response()->json([
            'success'   => true,
            'user'      => [
                'id'           => $user->id,
                'first_name'   => $user->first_name,
                'last_name'    => $user->last_name,
                'email'        => $user->email,
                'phone_number' => $user->phone_number,
                'employee_id'  => $user->employee_id,
                'role'         => $user->role,
                'is_active'    => $user->is_active,
            ],
            'token'     => $token,
            'user_type' => $user->role,
        ]);
    }

    // ============================================
    // CUSTOMER LOGIN
    // ============================================
    public function customerLogin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Account not found'], 401);
        }

        if ($user->role !== 'customer') {
            return response()->json(['success' => false, 'message' => 'Customer access only'], 403);
        }

        if (! $user->is_active) {
            return response()->json(['success' => false, 'message' => 'Account is deactivated'], 403);
        }

        if (! $user->email_verified) {
            return response()->json(['success' => false, 'message' => 'Please verify your email first'], 403);
        }

        if (! Hash::check($request->password, $user->password)) {
            return response()->json(['success' => false, 'message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('customer-token')->plainTextToken;

        return response()->json([
            'success'   => true,
            'user'      => [
                'id'           => $user->id,
                'first_name'   => $user->first_name,
                'middle_name'  => $user->middle_name ?? '',
                'last_name'    => $user->last_name,
                'email'        => $user->email,
                'phone_number' => $user->phone_number,
                'address'      => $user->address,
                'role'         => $user->role,
            ],
            'token'     => $token,
            'user_type' => 'customer',
        ]);
    }

    // ============================================
    // SEND OTP — stores in otp_codes table
    // ============================================
    public function sendOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'      => 'required|email',
            'first_name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Invalid email'], 422);
        }

        $email = strtolower(trim($request->email));

        // Block if fully registered and active
        $existingActive = User::where('email', $email)->where('is_active', true)->first();
        if ($existingActive) {
            return response()->json(['success' => false, 'message' => 'Email is already registered'], 422);
        }

        $customerName = $request->first_name ?: 'Customer';

        // Remove stale pending users for this email
        User::where('email', $email)->where('is_active', false)->delete();

        // Create a fresh pending user
        $pendingUser = User::create([
            'email'          => $email,
            'email_verified' => false,
            'is_active'      => false,
            'role'           => 'customer',
            'first_name'     => $request->first_name ?? 'Pending',
            'last_name'      => 'Pending',
            'phone_number'   => 'pending_' . md5($email),
            'password'       => Hash::make(\Illuminate\Support\Str::random(16)),
        ]);

        // Create OTP record in otp_codes table
        $otp = $pendingUser->issueOtp();

        try {
            Mail::to($email)->send(new OtpMail($otp->otp_code, $customerName));

            return response()->json([
                'success' => true,
                'message' => 'OTP sent to your email! Please check your inbox.',
            ]);
        } catch (\Exception $e) {
            Log::error('OTP email failed: ' . $e->getMessage());
            $pendingUser->delete();

            return response()->json([
                'success' => false,
                'message' => 'Failed to send OTP. Please try again.',
            ], 500);
        }
    }

    // ============================================
    // VERIFY OTP — checks otp_codes table
    // ============================================
    public function verifyOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Invalid OTP format'], 422);
        }

        $email = strtolower(trim($request->email));

        $pendingUser = User::where('email', $email)
            ->where('is_active', false)
            ->first();

        if (! $pendingUser) {
            return response()->json(['success' => false, 'message' => 'No pending registration found.'], 422);
        }

        // Find matching, unused, unexpired OTP in otp_codes
        $otpRecord = OtpCode::where('user_id', $pendingUser->id)
            ->where('otp_code', trim($request->otp))
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->first();

        if (! $otpRecord) {
            // Check if code exists but is expired
            $expiredOtp = OtpCode::where('user_id', $pendingUser->id)
                ->where('otp_code', trim($request->otp))
                ->where('is_used', false)
                ->first();

            if ($expiredOtp) {
                return response()->json(['success' => false, 'message' => 'OTP has expired. Please request a new one.'], 422);
            }

            return response()->json(['success' => false, 'message' => 'Invalid OTP code.'], 422);
        }

        // Mark OTP as used and user as verified
        $otpRecord->update(['is_used' => true]);
        $pendingUser->update(['email_verified' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully!',
        ]);
    }

    // ============================================
    // CUSTOMER REGISTER
    // ============================================
    public function customerRegister(Request $request)
{
    $email = strtolower(trim($request->email ?? ''));

    // Must have a verified pending user
    $pendingUser = User::where('email', $email)
        ->where('email_verified', true)
        ->where('is_active', false)
        ->first();

    if (! $pendingUser) {
        return response()->json([
            'success' => false,
            'message' => 'Please verify your email address first.',
        ], 422);
    }

    $validator = Validator::make($request->all(), [
        'first_name'    => 'required|string|max:255',
        'middle_name'   => 'nullable|string|max:255',
        'last_name'     => 'required|string|max:255',
        'email'         => 'required|string|email|max:255',
        'phone_number'  => 'required|string|max:20|unique:users,phone_number,' . $pendingUser->id,
        'password'      => 'required|string|min:6|confirmed',
        'address'       => 'nullable|string|max:500',
        'plate_number'  => 'required|string|max:20',
        'vehicle_model' => 'required|string|max:255',
        // License fields
        'license_number' => 'nullable|string|max:50',
        'license_type'   => 'nullable|in:professional,non_professional,student',
        'license_expiration' => 'nullable|date|after:today',
        'license_photo'  => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors'  => $validator->errors(),
        ], 422);
    }

    try {
        DB::beginTransaction();

        $licensePhotoPath = null;
        $licensePhotoOriginalName = null;

        // Handle license photo upload if provided
        if ($request->hasFile('license_photo')) {
            $file = $request->file('license_photo');
            $licensePhotoOriginalName = $file->getClientOriginalName();
            $licensePhotoPath = $file->store('license_photos', 'public');
        }

        $pendingUser->update([
            'first_name'     => $request->first_name,
            'middle_name'    => $request->middle_name ?? null,
            'last_name'      => $request->last_name,
            'phone_number'   => $request->phone_number,
            'address'        => $request->address ?? null,
            'password'       => Hash::make($request->password),
            'role'           => 'customer',
            'customer_type'  => 'registered', // ✅ FIX: Set customer_type to 'registered'
            'is_active'      => true,
            'email_verified' => true,
            // License fields
            'license_number' => $request->license_number ?? null,
            'license_type'   => $request->license_type ?? null,
            'license_expiration' => $request->license_expiration ?? null,
            'license_photo'  => $licensePhotoPath,
            'license_photo_original_name' => $licensePhotoOriginalName,
        ]);

        Vehicle::create([
            'customer_id'   => $pendingUser->id,
            'plate_number'  => strtoupper(trim($request->plate_number)),
            'vehicle_model' => trim($request->vehicle_model),
        ]);

        DB::commit();

        Log::info('Customer registered', ['user_id' => $pendingUser->id, 'email' => $pendingUser->email]);

        return response()->json([
            'success' => true,
            'message' => 'Registration successful! Please login.',
        ], 201);
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Registration error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Registration failed. Please try again.',
        ], 500);
    }
}
    // ============================================
    // LOGOUT / ME helpers
    // ============================================
    public function staffLogout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['success' => true, 'message' => 'Logged out successfully']);
    }

    public function staffMe(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'success' => true,
            'user'    => [
                'id'           => $user->id,
                'first_name'   => $user->first_name,
                'middle_name'  => $user->middle_name,
                'last_name'    => $user->last_name,
                'email'        => $user->email,
                'phone_number' => $user->phone_number,
                'employee_id'  => $user->employee_id,
                'role'         => $user->role,
                'is_active'    => $user->is_active,
            ],
        ]);
    }

    public function customerLogout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['success' => true, 'message' => 'Logged out successfully']);
    }

    public function customerMe(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function customerProfile(Request $request)
{
    $user = $request->user()->load('vehicles');
    
    // Add license photo URL
    $user->license_photo_url = $user->license_photo ? asset('storage/' . $user->license_photo) : null;
    
    return response()->json(['success' => true, 'user' => $user]);
}

    public function updateCustomerProfile(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name'       => 'sometimes|required|string|max:255',
            'last_name'        => 'sometimes|required|string|max:255',
            'phone_number'     => 'sometimes|required|string|max:20',
            'password'         => 'sometimes|required|string|min:6|confirmed',
            'current_password' => 'required_with:password',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $user = $request->user();

        if ($request->filled('password')) {
            if (! Hash::check($request->current_password, $user->password)) {
                return response()->json(['success' => false, 'message' => 'Current password is incorrect.'], 422);
            }
            $user->password = Hash::make($request->password);
        }

        $user->fill($request->only([
            'first_name', 'middle_name', 'last_name', 'phone_number', 'address',
        ]))->save();

        return response()->json(['success' => true, 'message' => 'Profile updated successfully.', 'user' => $user]);
    }
}
