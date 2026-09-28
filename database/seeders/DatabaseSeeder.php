<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\ParkingSlot;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        // Clear tables in correct order
        $tables = [
            'inventory_logs', 'gasoline_payments', 'fuel_sales', 'fuel_inventory',
            'fuel_remittances', 'parking_remittances', 'parking_payments',
            'parking_transactions', 'bookings', 'vehicles', 'promo',
            'parking_slots', 'fuel_products', 'suppliers', 'otp_codes', 'users'
        ];

        foreach ($tables as $table) {
            DB::table($table)->truncate();
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // ─── 1. Create Admin ─────────────────────────────────────────────────
        $admin = User::create([
            'email'          => 'ragmacwelfred1@gmail.com',
            'password'       => Hash::make('password123'),
            'first_name'     => 'Admin',
            'middle_name'    => null,
            'last_name'      => 'User',
            'phone_number'   => '09123456789',
            'address'        => '123 Admin St, Manila, Philippines',
            'role'           => 'admin',
            'customer_type'  => null,
            'employee_id'    => 'ADMIN001',
            'is_active'      => true,
            'email_verified' => true,
        ]);

        // ─── 2. Create 2 Staff ───────────────────────────────────────────────
        $staff1 = User::create([
            'email'          => 'staff1@parking.com',
            'password'       => Hash::make('password123'),
            'first_name'     => 'John',
            'middle_name'    => 'Michael',
            'last_name'      => 'Doe',
            'phone_number'   => '09234567890',
            'address'        => '456 Staff St, Quezon City, Philippines',
            'role'           => 'staff',
            'customer_type'  => null,
            'employee_id'    => 'EMP001',
            'is_active'      => true,
            'email_verified' => true,
        ]);

        $staff2 = User::create([
            'email'          => 'staff2@parking.com',
            'password'       => Hash::make('password123'),
            'first_name'     => 'Jane',
            'middle_name'    => 'Marie',
            'last_name'      => 'Smith',
            'phone_number'   => '09345678901',
            'address'        => '789 Staff Ave, Makati City, Philippines',
            'role'           => 'staff',
            'customer_type'  => null,
            'employee_id'    => 'EMP002',
            'is_active'      => true,
            'email_verified' => true,
        ]);

        // ─── 3. Create Parking Slots (16 slots — ALL ₱200/night) ─────────────
        $slots = [];
        $slotNumbers = [
            'A01', 'A02', 'A03', 'A04',
            'A05', 'A06', 'A07', 'A08',
            'B01', 'B02', 'B03', 'B04',
            'B05', 'B06', 'B07', 'B08',
        ];

        $totalSlots = count($slotNumbers);
        foreach ($slotNumbers as $i => $slotNumber) {
            $status = 'available';
            if ($i < 3) {
                $status = 'occupied';
            } elseif ($i >= $totalSlots - 2) {
                $status = 'maintenance';
            }

            $slots[] = ParkingSlot::create([
                'slot_number'  => $slotNumber,
                'status'       => $status,
                'nightly_rate' => 200,
            ]);
        }

        $this->command->info('✅ Database seeded successfully!');
        $this->command->info('');
        $this->command->info('📊 SEED SUMMARY:');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->info('👤 Admin:        ragmacwelfred1@gmail.com / password123');
        $this->command->info('👤 Staff:        staff1@parking.com / password123');
        $this->command->info('👤 Staff:        staff2@parking.com / password123');
        $this->command->info('');
        $this->command->info('🅿️  Slots:        ' . count($slots) . ' parking slots (ALL ₱200/night)');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
}