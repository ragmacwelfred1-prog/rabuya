<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

// ✅ Public channel - no auth needed
Broadcast::channel('notifications', function () {
    return true;
});

Broadcast::channel('admin.bookings', function () {
    return true;
});

Broadcast::channel('staff.bookings', function () {
    return true;
});

Broadcast::channel('staff.parking', function () {
    return true;
});

Broadcast::channel('admin.parking', function () {
    return true;
});

// ✅ Private channel - requires auth
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Private channel for admins only
Broadcast::channel('admin.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId && $user->role === 'admin';
});

// Private channel for staff only
Broadcast::channel('staff.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId && in_array($user->role, ['staff', 'admin']);
});