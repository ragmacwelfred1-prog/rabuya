<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\ParkingSlot;
use App\Models\FuelProduct;
use App\Models\Supplier;
use App\Models\Vehicle;
use App\Models\Booking;
use App\Models\ParkingTransaction;
use App\Models\ParkingPayment;
use App\Models\FuelInventory;
use App\Models\FuelSale;
use App\Models\GasolinePayment;
use App\Models\InventoryLog;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

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

        // ─── 1. Create Users ──────────────────────────────────────────────────

        // Admin
        $admin = User::create([
            'email'          => 'admin@parking.com',
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

        // Staff
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

        // ─── 2. Create 3 Customers ─────────────────────────────────────────────

        $customers = [];
        $customerData = [
            // [first_name, middle_name, last_name, phone, email, address]
            ['Juan', 'Carlos', 'Dela Cruz', '09123456780', 'juan.delacruz@email.com', 'Blk 1 Lot 1, Tondo, Manila'],
            ['Maria', 'Isabel', 'Santos', '09234567891', 'maria.santos@email.com', 'Blk 2 Lot 2, Pasig City'],
            ['Pedro', 'Manuel', 'Reyes', '09345678902', 'pedro.reyes@email.com', 'Blk 3 Lot 3, Caloocan City'],
        ];

        foreach ($customerData as $data) {
            $customers[] = User::create([
                'email'          => $data[4],
                'password'       => Hash::make('password123'),
                'first_name'     => $data[0],
                'middle_name'    => $data[1],
                'last_name'      => $data[2],
                'phone_number'   => $data[3],
                'address'        => $data[5],
                'role'           => 'customer',
                'customer_type'  => 'registered',
                'employee_id'    => null,
                'is_active'      => true,
                'email_verified' => true,
            ]);
        }

        // ─── 3. Create Parking Slots (16 slots — ALL ₱200/night) ─────────────

        $slots = [];
        $slotNumbers = [
            // Left row - A1 to A8
            'A01', 'A02', 'A03', 'A04',
            'A05', 'A06', 'A07', 'A08',
            // Right row - B1 to B8
            'B01', 'B02', 'B03', 'B04',
            'B05', 'B06', 'B07', 'B08',
        ];

        $totalSlots = count($slotNumbers);
        foreach ($slotNumbers as $i => $slotNumber) {
            // Make first 3 slots occupied, last 2 maintenance, rest available
            $status = 'available';
            if ($i < 3) {
                $status = 'occupied';
            } elseif ($i >= $totalSlots - 2) {
                $status = 'maintenance';
            }

            $slots[] = ParkingSlot::create([
                'slot_number'  => $slotNumber,
                'status'       => $status,
                'nightly_rate' => 200, // ✅ ALL SLOTS ₱200
            ]);
        }

        // ─── 4. Create Vehicles for the 3 customers ───────────────────────────

        $vehicles = [];
        $vehicleData = [
            ['ABC-1234', 'Toyota Vios 2022'],
            ['XYZ-5678', 'Honda Civic 2021'],
            ['DEF-9012', 'Mitsubishi Mirage 2023'],
        ];

        foreach ($customers as $i => $customer) {
            $vehicles[] = Vehicle::create([
                'customer_id'   => $customer->id,
                'plate_number'  => $vehicleData[$i][0],
                'vehicle_model' => $vehicleData[$i][1],
            ]);
        }

        // ─── 5. Create 3 Completed Bookings (Customer Sales) ──────────────────

        foreach ($customers as $i => $customer) {
            $vehicle = $vehicles[$i];
            $slot = $slots[$i]; // A01, A02, A03 (already marked occupied above for realism)

            $checkIn = Carbon::now()->subDays(rand(3, 10))->setTime(14, 0, 0);
            $nights = rand(1, 3);
            $checkOut = $checkIn->copy()->addDays($nights)->setTime(12, 0, 0);

            $booking = Booking::create([
                'customer_id'     => $customer->id,
                'vehicle_id'      => $vehicle->id,
                'parking_slot_id' => $slot->id,
                'check_in_date'   => $checkIn,
                'check_out_date'  => $checkOut,
                'status'          => 'completed',
                'booking_type'    => $i % 2 === 0 ? 'online' : 'walk_in',
                'confirm_by_id'   => $admin->id,
                'promo_id'        => null,
            ]);

            $transaction = ParkingTransaction::create([
                'booking_id'     => $booking->id,
                'check_out_date' => $checkOut,
                'checked_in_by'  => $staff1->id,
            ]);

            $totalAmount = $nights * 200; // ₱200/night
            $amountPaid = $totalAmount + rand(0, 50);
            $changeAmount = max(0, $amountPaid - $totalAmount);
            $paymentMethod = ['cash', 'gcash', 'cash'][$i % 3];

            ParkingPayment::create([
                'parking_transaction_id' => $transaction->id,
                'booking_id'             => $booking->id,
                'discount'               => 0,
                'amount_paid'            => $amountPaid,
                'change_amount'          => $changeAmount,
                'payment_method'         => $paymentMethod,
                'status'                 => 'paid',
                'processed_by'           => $staff1->id,
                'paid_at'                => $checkOut,
            ]);
        }

        // ─── 6. Create Fuel Products (Gasoline, Diesel, Premium, Unleaded) ────

        $fuelProducts = [];
        $fuelTypes = [
            ['Gasoline', 58.50],
            ['Diesel', 55.25],
            ['Premium', 62.75],
            ['Unleaded', 56.75],
        ];

        foreach ($fuelTypes as $data) {
            $fuelProducts[] = FuelProduct::create([
                'type'                  => $data[0],
                'current_selling_price' => $data[1],
            ]);
        }

        // ─── 7. Create a Supplier ───────────────────────────────────────────────

        $supplier = Supplier::create([
            'supplier_name' => 'Petron Corporation',
        ]);

        // ─── 8. Create Fuel Inventory (one delivery per product) ──────────────

        $fuelInventories = [];

        foreach ($fuelProducts as $product) {
            $liters = rand(1000, 2500);
            $costPrice = $product->current_selling_price * 0.85;

            $inventory = FuelInventory::create([
                'fuel_product_id'         => $product->id,
                'supplier_id'             => $supplier->id,
                'delivery_date'           => Carbon::now()->subDays(rand(1, 15)),
                'liters_delivered'        => $liters,
                'remaining_liters'        => $liters,
                'cost_price_per_liter'    => $costPrice,
                'selling_price_per_liter' => $product->current_selling_price,
                'reference_no'            => 'INV-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
            ]);

            $fuelInventories[] = $inventory;

            InventoryLog::create([
                'fuel_inventory_id' => $inventory->id,
                'reference_id'      => $product->id,
                'movement'          => 'in',
                'liters'            => $liters,
                'liters_before'     => 0,
                'liters_after'      => $liters,
                'price_per_liter'   => $costPrice,
            ]);
        }

        // ─── 9. Create 3 Fuel Sales ─────────────────────────────────────────────

        $staffMembers = [$staff1, $staff2];
        $paymentMethods = ['cash', 'gcash', 'cash'];

        for ($i = 0; $i < 3; $i++) {
            $inventory = $fuelInventories[$i]; // Gasoline, Diesel, Premium
            $litersSold = rand(20, 100);
            $pricePerLiter = $inventory->selling_price_per_liter;
            $totalAmount = $litersSold * $pricePerLiter;
            $amountPaid = $totalAmount + rand(0, 50);
            $changeAmount = max(0, $amountPaid - $totalAmount);

            $sale = FuelSale::create([
                'fuel_inventory_id' => $inventory->id,
                'recorded_by'       => $staffMembers[$i % 2]->id,
                'sale_date'         => Carbon::now()->subHours(rand(1, 48)),
                'liters_sold'       => $litersSold,
                'price_per_liter'   => $pricePerLiter,
            ]);

            GasolinePayment::create([
                'fuel_sale_id'   => $sale->id,
                'amount_paid'    => $amountPaid,
                'change_amount'  => $changeAmount,
                'payment_method' => $paymentMethods[$i],
                'status'         => 'paid',
                'processed_by'   => $staffMembers[$i % 2]->id,
            ]);

            $remaining = $inventory->remaining_liters - $litersSold;

            InventoryLog::create([
                'fuel_inventory_id' => $inventory->id,
                'reference_id'      => $inventory->fuel_product_id,
                'movement'          => 'out',
                'liters'            => $litersSold,
                'liters_before'     => $inventory->remaining_liters,
                'liters_after'      => $remaining,
                'price_per_liter'   => $pricePerLiter,
            ]);

            $inventory->remaining_liters = $remaining;
            $inventory->save();
        }

        $this->command->info('✅ Database seeded successfully!');
        $this->command->info('');
        $this->command->info('📊 SEED SUMMARY:');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->info('👤 Admin:        admin@parking.com / password123');
        $this->command->info('👤 Staff:        staff1@parking.com / password123');
        $this->command->info('👤 Staff:        staff2@parking.com / password123');
        $this->command->info('');
        $this->command->info('👥 Customers:    ' . count($customers) . ' registered');
        $this->command->info('🚗 Vehicles:     ' . count($vehicles) . ' total');
        $this->command->info('📅 Bookings:     3 completed bookings (with payments)');
        $this->command->info('🅿️  Slots:        ' . count($slots) . ' parking slots (ALL ₱200/night)');
        $this->command->info('⛽ Fuel Products: ' . count($fuelProducts) . ' (Gasoline, Diesel, Premium, Unleaded)');
        $this->command->info('🛢️  Fuel Sales:   3 transactions');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->info('');
        $this->command->info('🔑 Test customer accounts (password: password123):');
        $this->command->info('   - juan.delacruz@email.com');
        $this->command->info('   - maria.santos@email.com');
        $this->command->info('   - pedro.reyes@email.com');
    }
}