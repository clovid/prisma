<!DOCTYPE html>
<html lang="{!! config('app.locale') !!}" ng-app="prisma">
<head>
	<base href="{{ config('app.base-href') }}">
	<meta charset="utf-8">
	<title>PRISMA - Learning Dashboard (Performance | Recording | Integration | Substraction | Mentoring | Awareness)</title>
	<link rel="apple-touch-icon-precomposed" sizes="144x144" href="{{ asset('apple-touch-icon-144x144.png') }}" />
	<link rel="apple-touch-icon-precomposed" sizes="152x152" href="{{ asset('apple-touch-icon-152x152.png') }}" />
	<link rel="icon" type="image/png" href="{{ asset('favicon-32x32.png') }}" sizes="32x32" />
	<meta name="application-name" content="PRISMA"/>
	<meta name="msapplication-TileColor" content="#FFFFFF" />
	<meta name="msapplication-TileImage" content="{{ asset('mstile-144x144.png') }}" />
	<script>
		var module = module || {};
	</script>
	@if (config('app.debug'))
	    <link rel="stylesheet" href="css/vendor.css">
	    <link rel="stylesheet" href="css/local.css">
	@else
	    <link rel="stylesheet" href="{{ rev_file('css/styles.css') }}">
	@endif
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</head>
<body>
    <div ui-view id="content" layout="column"></div>
	<script src="https://d3js.org/d3.v3.min.js"></script>
	@if (config('app.debug'))
	    <script src="js/vendor.js"></script>
	    <script src="js/local.js"></script>
	@else
	    <script src="{{ rev_file('js/scripts.js') }}"></script>
	@endif
	@foreach ($modules as $module)
		@if (!empty($module['pixel']))
			<iframe src="{{ $module['pixel'] }}" width="1" height="1"/>
		@endif
	@endforeach
</body>
</html>
