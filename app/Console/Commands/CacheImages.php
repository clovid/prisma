<?php

namespace App\Console\Commands;

use Cache;

use Illuminate\Console\Command;
use App\Services\ModuleService;
use App\Module;

class CacheImages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cache:images {module} {task}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cache images for a module task';

    protected $module;
    protected $taskId;
    protected $moduleService;

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
        $this->module = $this->argument('module');
        $this->taskId = $this->argument('task');
        if (Module::whereName($this->module)->count() <= 0) {
            return $this->error('Module not available. Choose one from: ' . Module::pluck('name')->implode(','));
        }
        $this->moduleService = new ModuleService($this->module);
        $this->info('# Getting data (TODO: get only structured data)');
        $data = $this->moduleService->summarizedDatasets($this->taskId);

        if (empty($data)) {
            return $this->error('Task for module not found');
        }

        $images = $data->reduce(function ($carry, $group) {
            if (empty($group['images'])) {
                return $carry;
            }
            return $carry->merge($group['images']);
        }, collect());

        $this->info('# Start caching slices for ' . $images->count() . ' images');

        foreach ($images as $i => $image) {
            $slices = $image->slices;
            $this->info('## Image ' . ($i + 1) . ' of ' . $images->count() . ' (id: ' . $image->id . ', slices: ' . count($slices) . ', overlays: ' . count($image->getOverlays()) . ')');

            $useBar = count($slices) > 1;
            if ($useBar) {
                $bar = $this->output->createProgressBar(count($slices));
            }

            foreach ($slices as $j => $slice) {
                if ($useBar) {
                    $bar->advance();
                }
                if (!isset($slice['hash'])) {
                    $this->warning('-- No hash for slice #' . ($j + 1) . ' (Image: ' . $image->id . ')');
                }
                $result = $this->persistImageSlice($slice['hash']);
                if ($result !== true) {
                    $this->warning('-- Image slice #' . ($j + 1) . ' not persisted: ' . $result['error']);
                }

                if (empty($slice['overlays'])) {
                    continue;
                }

                foreach ($slice['overlays'] as $overlay) {
                    if (!isset($overlay['hash'])) {
                        $this->warning('-- No hash for slice #' . ($j + 1) . ' (Overlay: ' . $overlay['id'] . ')');
                    }
                    $result = $this->persistImageSlice($overlay['hash']);
                    if ($result !== true) {
                        $this->warning('-- Overlay slice #' . ($j + 1) . ' not persisted: ' . $result['error']);
                    }
                }
            }
            if ($useBar) {
                $bar->finish();
                $this->info('');
            }
        }


        $this->info('# Finished caching slices for ' . $images->count() . ' images');
    }

    private function persistImageSlice($hash)
    {
        // Check if file exists
        $filePath = storage_path(config('files.path-prefix') . $hash);
        if (file_exists($filePath))
            return true;

        $config = Cache::get($hash);
        if (is_null($config) || !is_array($config)) {
            return ['error' => 'No image found'];
        }

        if (empty($config['module']) || empty($config['url']) || !isset($config['parameter'])) {
            return ['error' => 'No valid image config found', 'config' => $config];
        }
        if (Module::whereName($config['module'])->count() <= 0) {
            return ['error' => 'Module for image not activated', 'config' => $config];
        }

        $rawImage = $this->moduleService->client->getRaw($config['url'], $config['parameter']);
        if (is_null($rawImage))
            return ['error' => 'No valid response from external service', ['config' => $config]];

        file_put_contents($filePath, $rawImage);
        return true;
    }
}
