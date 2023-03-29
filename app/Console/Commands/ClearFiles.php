<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Carbon\Carbon;

class ClearFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'clear:files
                            {--u|until=now : Timestamp as string (see http://php.net/manual/en/function.strtotime.php)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clears the files cache';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        $until = $this->option('until');
        if (strtotime($until) === false) {
            return $this->error('Please provide a valid date/time string');
        }
        $until = Carbon::parse($until);
        $this->line('Remove cached files until ' . $until->toDateTimeString());

        $files = glob(storage_path(config('files.path-prefix'). '*'));

        if (empty($files)) {
            return $this->line('0 files removed');
        }

        $removedFiles = $this->removeFilesUntil($files, $until);

        return $this->line(count($removedFiles) . ' files removed');
    }

    private function removeFilesUntil($files, $until)
    {
        return array_filter($files, function ($file) use ($until) {
            return filectime($file) <= $until->timestamp && unlink($file);
        });
    }


}
