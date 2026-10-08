<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ids are UUIDs, as they were in the JSON files
        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 7); // expense | income
            $table->string('name', 40);
            $table->string('color', 7)->default('#71717a');
            $table->uuid('parent_id')->nullable(); // a subcategory: its category
            $table->timestamps();
            $table->foreign('parent_id')->references('id')->on('categories')->cascadeOnDelete();
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('category_id');
            $table->string('type', 7);
            $table->decimal('amount', 12, 2);
            $table->date('date')->index();
            $table->string('note', 200)->default('');
            $table->timestamps();
            $table->foreign('category_id')->references('id')->on('categories');
        });

        Schema::create('groceries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('priority', 6)->default('normal'); // high | normal | low
            $table->boolean('done')->default(false);
            $table->timestamp('done_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('groceries');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('categories');
    }
};
