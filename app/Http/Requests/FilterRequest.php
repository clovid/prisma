<?php

namespace App\Http\Requests;

use App\Http\Requests\Request;
use Gate;
use App\Module;

class FilterRequest extends Request
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        $module = Module::whereName($this->route('module'))->first();
        return !is_null($module) && Gate::allows('view-module', $module);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'cads_ids' => 'nullable|string',
            'timespans' => 'array',
        ];
    }
}
