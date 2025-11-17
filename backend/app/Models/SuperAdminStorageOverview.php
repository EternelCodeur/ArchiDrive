<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SuperAdminStorageOverview extends Model
{
    use HasFactory;

    protected $fillable = [
        'total_capacity',
        'used_storage',
    ];

    protected $casts = [
        'total_capacity' => 'integer',
        'used_storage'   => 'integer',
    ];
}
