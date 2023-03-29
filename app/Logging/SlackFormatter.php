<?php

namespace App\Logging;

use Monolog\Formatter\LineFormatter;

class SlackFormatter
{
  public function __invoke($logger)
  {
    foreach ($logger->getHandlers() as $handler) {
      $handler->pushProcessor(function ($record) {
        $record['extra']['app_url'] = config('app.url');
        return $record;
      });
      $format = "[%extra.app_url%] *%level_name%*: %message% %context%\n";
      $formatter = new LineFormatter($format, null, false, true);
      $handler->setFormatter($formatter);
    }
  }
}