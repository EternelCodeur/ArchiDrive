<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'folder_id',
        'service_id',
        'enterprise_id',
        'file_path',
        'mime_type',
        'size_bytes',
        'created_by',
    ];
}
