<?php

namespace App\Services\Auth;

/**
 * Helper for the user ticket based guards.
 *
 * @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
 */
trait UserTicketHelper
{

    /**
     * The name of the field on the request containing the user ticket.
     *
     * @var string
     */
    protected $ticketKey = 'user_ticket';

    /**
     * Get the ticket for the current request.
     *
     * @return string
     */
    protected function getTicketFromRequest(Request $request = null)
    {
        $request = is_null($request) ? request() : $request;
        $ticket = $request->input($this->ticketKey);

        if (empty($ticket)) {
            $ticket = $request->bearerToken();
        }

        return $ticket;
    }
}