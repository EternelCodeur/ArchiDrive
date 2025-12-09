<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SharedFolder extends Model
{
    use HasFactory;

    protected $fillable = [
        'enterprise_id',
        'folder_id',
        'name',
        'visibility',
        'created_by',
    ];

    public function services()
    {
        return $this->belongsToMany(Service::class, 'shared_folder_service');
    }

    public function folder()
    {
        return $this->belongsTo(Folder::class);
    }
}
