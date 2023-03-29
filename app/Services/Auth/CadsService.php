<?php

namespace App\Services\Auth;

Use Log;

/**
 * @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
 */
class CadsService {

    use UserTicketHelper;

    protected $appId = 6551087;
    protected $queryId = 685531473;
    protected $cads;

    protected $usernameKey = 'login';
    protected $passwordKey = 'password';

    function __construct()
    {
        if (config('app.env') === 'local')
          $this->cads = new DummyCadsLibrary($this->appId);
        else
          $this->cads = new CadsLibrary($this->appId);
    }

    /**
     * Validates the user ticket
     * @param  string $ticket optional
     * @return boolean             [description]
     */
    public function validateTicket($ticket = null)
    {
        if (!is_null($ticket))
            $this->cads->setUserTicket($ticket);
        return $this->cads->validateTicket();
    }

    /**
     * Attempt a login. Return ticket if succeed
     *
     * @return string|bool
     */
    public function attempt($credentials, $remember = false)
    {
        $action = $remember ? CadsLibrary::SET_TICKET : null;

        $ticket = $this->cads->simulateLogin($credentials[$this->usernameKey], $credentials[$this->passwordKey], $action);
        if ($ticket !== false)
            $this->cads->setUserTicket($ticket);
        return $ticket;
    }

    /**
     * Load user data from cads / akzento
     * @param  [type] $ticket [description]
     * @return [type]         [description]
     */
    public function user($ticket = null)
    {
        if (is_null($ticket))
            $ticket = $this->cads->getUserTicket();
        $result = $this->cads->executeQuery($this->queryId, [1 => $ticket]);

        $mapping = [
            'Vorname' => 'first_name',
            'Nachname' => 'last_name',
            'ApplicationUserID' => 'app_id',
            'CADSID' => 'cads_id',
            'SemesterID' => 'semester_id',
        ];

        $data = [];

        foreach ($mapping as $cadsKey => $appKey) {
            foreach ($result as $pair) {
                if ($pair['name'] !== $cadsKey)
                    continue;
                if ($pair['value'] === 'null' || $pair['value'] === '0')
                    $data[$appKey] = null;
                else
                    $data[$appKey] = $pair['value'];
                break;
            }
        }

        return $data;
    }

    /**
     * Invalidates the current ticket (e.g. for logout)
     *
     * @return bool
     */
    public function invalidateTicket() {
        return $this->cads->doLogout();
    }

    public function getTicket()
    {
        $ticket = $this->cads->getUserTicket();
        if (empty($ticket))
            $ticket = $this->getTicketFromRequest();
        return $ticket;
    }

    /**
     * Class destructor
     */
    public function __destruct() {
        unset($this->appId, $this->queryId, $this->cads);
    }
}