<?php

namespace App\Exceptions;

use RuntimeException;

class ServiceNotFoundException extends RuntimeException
{
    /**
     * Name of the affected service.
     *
     * @var string
     */
    protected $service;

	function __construct($service)
	{
        $this->service = $service;
		$this->message = "Couldn't load service {$service} because of invalid config.";
	}

    public function getService()
    {
        return $this->service;
    }
}