<?php

if (! function_exists('rev_file')) {
    /**
     * Get the path to a versioned file.
     *
     * @param  string  $file
     * @return string
     *
     * @throws \InvalidArgumentException
     */
    function rev_file($file)
    {
        static $manifest;

        if (is_null($manifest))
            $manifest = json_decode(file_get_contents(public_path('rev-manifest.json')), true);

        if (isset($manifest[$file]) && file_exists(public_path($manifest[$file])))
            return $manifest[$file];

        if (file_exists(public_path($file)))
            return $file;

        throw new InvalidArgumentException("File {$file} not defined in asset manifest.");
    }
}

?>
