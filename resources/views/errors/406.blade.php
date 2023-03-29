<!DOCTYPE html>
<html>
    <head>
	    <base href="{{ config('app.base-href') }}">
        <title>{{ trans('Nicht unterstützter Browser') }}</title>

        <link href="https://fonts.googleapis.com/css?family=Lato:300" rel="stylesheet" type="text/css">

        <style>
            html, body {
                height: 100%;
            }

            body {
                margin: 0;
                padding: 0;
                width: 100%;
                /*color: #B0BEC5;*/
                display: table;
                /*font-weight: 100;*/
                font-weight: 300;
                font-family: 'Lato';
                background-image: url('images/login/login_teaser.jpg');
                background-size: cover;
                background-position: right;
            }

            .container {
                text-align: center;
                display: table-cell;
                vertical-align: middle;
            }

            .content {
                text-align: center;
                display: inline-block;
                max-width: 576px;
                width: 100%;
                background: rgba(229, 235, 186, 0.71);
                padding: 30px;
            }

            .title {
                font-size: 2.5em;
                margin-bottom: 20px;
            }

            .text {
                font-size: 2em;
            }

            a {
                color: #1c5871;
            }

            a:visited {
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="content">
                <div class="title-image"><img src="{{ asset('images/login/block.png') }}"></div>
                <div class="title">Dieser Browser ({{ $browserName }}) wird nicht unterstützt!</div>
                <div class="text">Um mit <strong>PRISMA</strong> zu arbeiten, verwenden Sie bitte z.B.
                    <strong><a href="https://www.google.com/chrome/browser/desktop/index.html">Google Chrome</a></strong><br/>
                    <small>(Unterstützte Browser: {{ implode(', ', $supportedBrowsers)}})</small>.
                </div>
            </div>
        </div>
    </body>
</html>
