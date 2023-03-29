<?php

namespace App;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'login',
        'is_admin',
        'active',
        'first_name',
        'last_name',
        'app_id',
        'cads_id',
        'password',
        'config',
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'user_ticket',
        'password'
    ];

    /**
     * Updates the information of the user model.
     * @param  array  $data array with new data
     * @return null
     */
    public function updateInformation ($data = [])
    {
        foreach (['first_name', 'last_name', 'cads_id'] as $value) {
            if (isset($data[$value]))
                $this[$value] = $data[$value];
        }
        $this->save();
    }

    /**
     * We misuse the remember me token as user ticket.
     * @return [type] [description]
     */
    public function getRememberTokenName ()
    {
        return 'user_ticket';
    }

    /**
     * Checks, if the user is local, and not from an external authenticator (like CADS).
     * @return boolean
     */
    public function isLocal ()
    {
        return $this->password !== null;
    }

    public function modules()
    {
        return $this->belongsToMany(Module::class)->withTimestamps();
    }

    public function getConfigAttribute($value)
    {
        return json_decode($value, true);
    }

    public function setConfigAttribute($value)
    {
        if (empty($value)) {
            $value = null;
        }
        $this->attributes['config'] = json_encode($value);
    }
}
