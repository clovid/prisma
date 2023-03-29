<?php

namespace App\Services\Auth;

use DOMDocument;

/**
 * Cadslib Class
 * @author      Niels Tegtbauer <tegtbauer@imfl.de>
 */

// use Log;

class CadsLibrary {

    const GENERATE_NEW_APPUSERID        = 500;              //Generate AppUserID if user has none
    const SET_TICKET                    = 550;              //Sets automatically teh ticket with login
    const DO_NOT_USE_TICKET             = 600;              //For requests without ticket

    private $appUserId                  = null;
    private $appId                      = null;
    private $userTicket                 = null;
    private $ddoc                       = null;

    private $requestPath                = '/cads';
    private $requestServer              = 'https://cads.uni-muenster.de';

    private $log                        = null;

    /**
     * Class Constructor
     *
     * @param <int> $appId Application ID
     * @param <string> $userTicket Ticket of the user (MD5 hash)
     * @param <string> $requestServer Cads Server (default: https://cads.uni-muenster.de)
     */
    public function __construct($appId = null, $userTicket = null, $requestServer = null) {
        if ($appId) $this->setAppId($appId);
        if ($userTicket) $this->setTicket($userTicket);
        if ($requestServer) $this->setRequestServer($requestServer);
        $this->ddoc = new DOMDocument('1.0', 'UTF-8');
    }

   /**
    * Clears the DOMDocument
    */
    private function setCleanDOMDocument() {
        if ($this->ddoc->hasChildNodes()) {
            $this->ddoc->removeChild($this->ddoc->firstChild);
        }
    }

    /**
     * Log content
     * @param <string> $content
     * @param <int> $type
     */
    private function l( $content, $type = null) {
        $content = (string) $content;
        switch ($type) {
            case 'error':
                // Log::error($content);
                break;

            default:
                // Log::info($content);
                break;
        }
    }

    /**
     * Set the application ID
     * @param <int> $appId
     */
    public function setAppId($appId) {
        $this->appId = (int)$appId;
    }

    /**
     * Get the application ID
     * @return <int>
     */
    public function getAppId() {
        return $this->appId;
    }

    /**
     * Set the user ticket
     * @param <string> $userTicket (MD5)
     */
    public function setUserTicket($userTicket) {
        $this->userTicket = (string)$userTicket;
    }

    /**
     * Get the user ticket
     * @return <string>
     */
    public function getUserTicket() {
        return $this->userTicket;
    }

    /**
     * Set the Server for requests (default: https://cads.uni-muenster.de)
     * @param <string> $requestServer
     */
    public function setRequestServer($requestServer) {
        $this->requestServer = (string)$requestServer;
    }

    /**
     * Get the server for requests
     * @return <string>
     */
    public function getRequestServer() {
        return $this->requestServer;
    }

    /**
     * Start a cads request
     * @param <string> $path This ist mostly the cads action which should be started
     * @param <string> $request The cads request
     * @return <boolean or string> Returns false on error otherwise the response as string
     */
    private function requestCads($path, $request) {

        $url = $this->getRequestServer() . $this->requestPath . $path;
        $this->l('Requesting CADS with the following URL: ' .$url);

        $curl = curl_init();
        curl_setopt($curl, CURLOPT_POST,1);
        curl_setopt($curl, CURLOPT_POSTFIELDS,(string)$request);
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST,  2);
        curl_setopt($curl, CURLOPT_USERAGENT, 'Cadslib');
        curl_setopt($curl, CURLOPT_RETURNTRANSFER,1);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, FALSE);
        curl_setopt($curl, CURLOPT_TIMEOUT, 10 );
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10 );

        $response = curl_exec($curl);

        if (curl_error($curl)) {
            $this->l('CURL error: ' . curl_error($curl), 'error');
            curl_close($curl);
            unset($curl);
            return false;
        }
        else {
            curl_close($curl);
            unset($curl);
            $this->l('CADS Response: ' . $response);
            return (string)$response;
        }
    }

    /**
     * Checks if the cads request succeeded
     * @param <string> $response The response of the cads Server
     * @return <boolean> true if succeeded otherwise false
     */
    private function checkSuccess($response) {
        $this->setCleanDOMDocument();
        $this->ddoc->loadXML($response);

        $l = $this->ddoc->getElementsByTagName('status');
        if ($l->length == 1) {
            return ($l->item(0)->childNodes->item(1)->nodeName == 'success');
        }
        else {
            $this->l('CADS failed: ' . $response, 'error');
            return false;
        }
    }

    private function remoteAddress()
    {
        if (isset($_SERVER['REMOTE_ADDR']))
            return $_SERVER['REMOTE_ADDR'];
        return '127.0.0.1';
    }

    /**
     * Validates a given user ticket
     * @return <boolean> true if success otherwise false
     */
    public function validateTicket() {
        $this->setCleanDOMDocument();
        $e = $this->ddoc->createElement('request');
        $e->appendChild($this->ddoc->createElement('user-ticket', $this->getUserTicket()));
        $e->appendChild($this->ddoc->createElement('ip', $this->remoteAddress()));
        $this->ddoc->appendChild($e);

        return $this->checkSuccess($this->requestCads('/ValidateUserTicket', $this->ddoc->saveXML()));
    }

    /**
     * Simulates a cads login with the given username and password
     * @param <string> $username The username of the user to login
     * @param <string> $password The password of the user to login
     * @param <int> $action Use Cadslib::SET_TICKET to set the ticket after a successful login
     * @return <boolean or string> False on login failure or string with the userticket
     */
    public function simulateLogin($username, $password, $action = null) {
        $url = 'username=' . urlencode($username) . '&password=' . urlencode($password) .
        '&ip=' . urlencode($this->remoteAddress());

        $this->l('Logging in ' . $username);

        $response = $this->requestCads('/DoLogin', $url);

        if ($this->checkSuccess($response)) {
            $this->setCleanDOMDocument();
            $this->ddoc->loadXML($response);
            $l = $this->ddoc->getElementsByTagName('user-ticket');
            if ($l->length == 1) {
                if ($action == self::SET_TICKET) {
                    $this->setUserTicket((string)$l->item(0)->nodeValue);
                }
                return (string)$l->item(0)->nodeValue;
            }
            else {
                $this->l('CADS failed: No userticket found', 'error');
                return false;
            }
        }
        else {
            $this->l('CADS failed: ' . $response, 'error');
            return false;
        }
    }

    /**
     * Get the application user id of the current logged in user
     * @param <int> $action Use Cadslib::GENERATE_NEW_APPUSERID if you wish to create a application user id when the current user has none
     * @return <boolean or int> False on general failure or the application user id
     */
    public function getAppUserId($action = null) {
        $this->setCleanDOMDocument();
        $e = $this->ddoc->createElement('request');
        $e->appendChild($this->ddoc->createElement('user-ticket', $this->getUserTicket()));
        $e->appendChild($this->ddoc->createElement('application-id', $this->getAppId()));
        $this->ddoc->appendChild($e);

        if ($action == self::GENERATE_NEW_APPUSERID) {
            $response = $this->requestCads('/GenerateAppUser', $this->ddoc->saveXML());
        }
        else {
            $response = $this->requestCads('/GetAppUser', $this->ddoc->saveXML());
        }

        if ($this->checkSuccess($response)) {
            $this->setCleanDOMDocument();
            $this->ddoc->loadXML($response);

            $l = $this->ddoc->getElementsByTagName('application-user-id');
            if ($l->length == 1) {
                return (int)$l->item(0)->nodeValue;
            }
            else {
                return false;
            }
        }
        else {
            $this->l('CADS failed: ' . $response, 'error');
            return false;
        }
    }
    public function setAppUserId($appUserId){

        $this->appUserId = (int)$appUserId;
    }
    /**
     * Logout user from cads
     * @return <boolean> True if logout succeeded otherwise false
     */
    public function doLogout() {
        $this->setCleanDOMDocument();
        $e = $this->ddoc->createElement('request');
        $e->appendChild($this->ddoc->createElement('user-ticket', $this->getUserTicket()));
        $this->ddoc->appendChild($e);

        $response = $this->requestCads('/DoLogout', $this->ddoc->saveXML());
        if ($this->checkSuccess($response)) {
            return true;
        }
        else {
            $this->l('CADS failed: ' . $response, 'error');
            return false;
        }
    }

    /**
     * Executes a cads query
     * @param <int> $id Id of the cads query to use
     * @param <array> $params Array of parameters in key value style (array('key' => 'value'))
     * @param <int> $action Use Cadslib::DO_NOT_USE_TICKET if the query doesnt need a ticket
     * @return <boolean or array> False on general error or array with name value pairs of the result
     */
    public function executeQuery($id=0, $params=array(), $action=null) {
        $this->setCleanDOMDocument();
        $e = $this->ddoc->createElement('request');
        $e->appendChild($this->ddoc->createElement('user-ticket', $this->getUserTicket()));
        $e->appendChild($this->ddoc->createElement('application-id', $this->getAppId()));
        $e->appendChild($this->ddoc->createElement('query-id', (int)$id));
        $e1 = $e->appendChild($this->ddoc->createElement('query-parameters'));

        foreach ($params as $key=>$value) {
            $e2 = $e1->appendChild($this->ddoc->createElement('parameter'));
            $e2->appendChild($this->ddoc->createElement('index', $key));
            $e2->appendChild($this->ddoc->createElement('value', $value));
        }

        $this->ddoc->appendChild($e);
        if ($action == self::DO_NOT_USE_TICKET) {
            $response = $this->requestCads('/GetDataNoTicket', $this->ddoc->saveXML());
        }
        else {
            $response = $this->requestCads('/GetData', $this->ddoc->saveXML());
        }

        $this->l('Executing CADS Query: ' . $this->ddoc->saveXML());

        if ($this->checkSuccess($response)) {
            $this->setCleanDOMDocument();
            $this->ddoc->loadXML($response);
            $l = $this->ddoc->getElementsByTagName('column');

            $result = array();
            for ($i = 0; $i<$l->length; $i++) {
                $result[$i]['name'] = $l->item($i)->childNodes->item(3)->nodeValue;
                $result[$i]['value'] = $l->item($i)->childNodes->item(5)->nodeValue;
            }
            return $result;
        }
        else {
            $this->l('CADS failed: ' . $response, 'error');
            return false;
        }
    }

    /**
     * Class destructor
     */
    public function __destruct() {
        unset($this->appUserId, $this->appId, $this->userTicket, $this->ddoc, $this->requestPath, $this->requestServer);
    }

}