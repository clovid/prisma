<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Psr7\MultipartStream;

use Log;
use Cache;

use App\Exceptions\ServiceNotFoundException;

/**
 * @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
 */

class RequestService {

	/**
	 * Name of the service, for that the request service is used
	 * @var string
	 */
	public $service;

	/**
	 * Base url of the service, for that the request service is used
	 * @var string
	 */
	public $baseUrl;

	/**
	 * HTTP Client to connect to service API.
	 * @var GuzzleHttp\Client
	 */
	protected $client;

	function __construct($service)
	{
		$this->service = $service;
		$this->baseUrl = config('services.' . $service . '.base-url');

		$config = [
			'base_uri' => $this->baseUrl,
			'cookies' => config('services.' . $service . '.cookies', false),
		];

		if (empty($this->baseUrl))
			throw new ServiceNotFoundException($service);

		$this->setAuthorizationHeader($service, $config);

		$config['connect_timeout'] = 10;

		$this->client = new Client($config);
	}

	public function getJson($url, $parameter = [])
	{
		Log::debug('Performed getJson', [
			'parameter' => $parameter,
		]);
		return $this->requestJson('GET', $url, [
			'query' => $parameter,
			'headers' => [
				'Accept' => 'application/json',
			]
		]);
	}

	public function getRaw ($url, $parameter = [])
	{
		$response = $this->client->request('GET', $url, ['query' => $parameter]);
		if ($response->getStatusCode() !== 200) {
			Log::error('Error when request url', ['service' => $this->service, 'url' => $url]);
			return;
		}
		return $response->getBody()->getContents();
	}

	public function postMultipartFormData($url, $payload)
	{
		Log::debug('Performed postMultipartFormData', [
			'payload' => $payload,
		]);
		$config = [
			'headers' => [],
		];
		$boundary = 'clovid_boundary';
		$multipart = array_map(function ($key, $value) {
			return [
				'name' => $key,
				'contents' => $value,
			];
		}, array_keys($payload), $payload);
		$config['headers']['Connection'] = 'close';
		$config['headers']['Content-Type'] = 'multipart/form-data; boundary=' . $boundary;
		$config['body'] = new MultipartStream($multipart, $boundary);
		return $this->requestJson('POST', $url, $config);
	}

	public function postJson($url, $parameter = [], $json = [])
	{
		Log::debug('Performed postJson', [
			'parameter' => $parameter,
			'body' => $json,
		]);

		return $this->requestJson('POST', $url, ['query' => $parameter, 'json' => $json]);
	}

	private function requestJson($method, $url, $config)
	{
		if (config('app.debug')) {
			$config['on_stats'] = function ($stats) {
				Log::debug('Performed requestJson', [
					'uri' => (string) $stats->getEffectiveUri(),
					'timing' => $stats->getTransferTime(),
					'success' => $stats->hasResponse(),
				]);
			};
		}
		$response = $this->client->request($method, $url, $config);

		return $this->handleJsonReponse($response, $url);
	}

	private function handleJsonReponse ($response, $url)
	{
		if ($response->getStatusCode() !== 200) {
			Log::error('Error when request url', ['service' => $this->service, 'url' => $url]);
			return;
		}

		$rawContent = $response->getBody()->getContents();
		$jsonContent = json_decode($rawContent, true);

		if (is_null($jsonContent))
			Log::error('Error when decoding response', ['service' => $this->service, 'json_error' => json_last_error(), 'raw_content' => $rawContent]);
		return $jsonContent;
	}

	private function setAuthorizationHeader($service, &$config)
	{
		$authType = config('services.' . $service . '.auth-type');
		if (empty($authType)) {
			return;
		}
		switch ($authType) {
			case 'oauth':
				$bearerToken = $this->getBearerTokenViaOAuth($service);
				break;

			default:
				$bearerToken = config('services.' . $service . '.api-token');
				break;
		}
		if (!empty($bearerToken)) {
			$config['headers'] = [
				'Authorization' => 'Bearer ' . $bearerToken,
			];
		}
	}

	private function getBearerTokenViaOAuth($service)
	{
		$cacheKey = 'services.' . $service . '.access-token';
		$bearerToken = Cache::get($cacheKey);
		if (empty($bearerToken)) {
			$oauthUrl = config('services.' . $service . '.oauth-url');
			$oauthClient = new Client();
			$payload = [
				'grant_type' => 'client_credentials',
				'client_id' => config('services.' . $service . '.client-id'),
				'client_secret' => config('services.' . $service . '.client-secret'),
			];
			try {
				$tokenRespone = $oauthClient->request('POST', $oauthUrl, [
					'on_stats' => function ($stats) {
						Log::debug('Performed requestJson', [
							'uri' => (string) $stats->getEffectiveUri(),
							'timing' => $stats->getTransferTime(),
							'success' => $stats->hasResponse(),
						]);
					},
					'form_params' => $payload,
				]);
				$token = $this->handleJsonReponse($tokenRespone, $oauthUrl);
			}	catch (\GuzzleHttp\Exception\ClientException $e) {
				\Log::error('Couldn\'t request bearer token, because authorization via oauthurl ' . $oauthUrl . ' failed.', ['message' => $e->getMessage(), 'code' => $e->getCode()]);
				$token = [];
			}
			if (isset($token['access_token'])) {
				$bearerToken = $token['access_token'];
				Cache::put($cacheKey, $bearerToken, $token['expires_in']);
			}
		}
		return $bearerToken;
	}

}
