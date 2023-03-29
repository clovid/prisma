<?php

namespace App\Services;

use Log;
use Cache;

/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*/
class OmeroService
{

	/**
	 * Request Service, mapper for GuzzleHttp Client.
	 * @var App\Services\RequestService
	 */
  protected $client;

  private $sessionUuid;

	function __construct()
	{
    $this->client = new RequestService('omero');
	}

  public function getSession() {
    if (empty($this->sessionUuid)) {

      $cacheKey = 'omero_session';
      if (Cache::has($cacheKey)) {
        $this->sessionUuid = Cache::get($cacheKey);
      } else {
        $token = $this->getToken();
        if (is_null($token)) {
          \Log::error('Couldn\'t get token from omero');
          return;
        }

        $result = $this->client->postMultipartFormData('login/', [
          'username' => config('services.omero.username'),
          'password' => config('services.omero.password'),
          'server' => '1',
          'csrfmiddlewaretoken' => $token,
        ]);

        if (is_null($result) || !$result['success']) {
          \Log::error('Couldn\'t get login result from omero', ['result' => $result]);
          return;
        }

        $this->sessionUuid = $result['eventContext']['sessionUuid'];
        Cache::put($cacheKey, $this->sessionUuid, config('services.omero.session-timeout'));
      }

    }
    return $this->sessionUuid;
  }

  public function prepareAndAuthenticateUrl($url) {
    $preparedUrl = $this->prepareUrl($url);
    return $this->authenticateUrl($preparedUrl);
  }

  public function prepareUrl($url) {
    if (!starts_with($url, '/')) {
      $url = preg_replace('/^(https?:\/\/)?(www\.)?([^\/]+)\/?/', '', $url);
    }
    return config('services.omero.domain') . $url;
  }

  public function authenticateUrl($url) {
    $session = $this->getSession();
    $url .=  (strpos($url, '?') ? '&' : '?') . 'server=1&bsession=' . $session;
    return $url;
  }

  private function getToken() {
    $result = $this->client->getJson('token/');
    if (!is_null($result)) {
      return $result['data'];
    }
    return;
  }

}