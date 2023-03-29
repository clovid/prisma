<?php

namespace App;

use InvalidArgumentException;

class ImageVolume implements \JsonSerializable {
	public $id;
	public $title;
	public $initialSlice = 0;
	public $currentOrientation = 'z';
	public $currentWindow;
	public $type;
	public $slices = [];
	protected $dimensions = [
		'x' => 1,
		'y' => 1,
		'z' => 1,
	];
	protected $offset = [
		'x' => 0,
		'y' => 0,
		'z' => 0,
	];
	protected $overlays = [];
	protected $axes = ['x', 'y', 'z'];


	function __construct($id, $config, $type = 'image') {
		$this->id = $id;
		$this->type = $type;

		if (!isset($config['dimensions'])) {
			throw new InvalidArgumentException('Dimensions are missing for ImageVolume');
		}
		$this->setDimensions($config['dimensions']);

		$offset = isset($config['offset']) ? $config['offset'] : [];
		$this->setOffset($offset);

		if (isset($config['title'])) {
			$this->title = $config['title'];
		}

		if (isset($config['initial_slice_number'])) {
			$this->initialSlice = $config['initial_slice_number'];
		}

		if (isset($config['initial_orientation'])) {
			$this->currentOrientation = $config['initial_orientation'];
		}

		if (isset($config['initial_window'])) {
			$this->currentWindow = $config['initial_window'];
		}
	}

	public function getDimensions($axis = null)
	{
		if (!is_null($axis) && isset($this->dimensions[$axis])) {
			return $this->dimensions[$axis];
		}
		return $this->dimensions;
	}

	public function setDimensions($dimensions)
	{
		if (!is_array($dimensions)) {
			$dimensions = [];
		}

		$this->dimensions = array_merge($this->dimensions, $dimensions);
	}

	public function getDimensionsForOrientation($axis)
	{
		if (!in_array($axis, $this->axes)) {
			throw new InvalidArgumentException('Wrong axis provided for getDimensionsForOrientation. Only x, y oder z allowed');
		}

		return array_diff_key($this->getDimensions(), [$axis => '']);
	}

	public function getOffset($axis = null)
	{
		if (!is_null($axis) && isset($this->offset[$axis])) {
			return $this->offset[$axis];
		}
		return $this->offset;
	}

	public function setOffset($offset)
	{
		if (!is_array($offset)) {
			$offset = [];
		}

		$this->offset = array_merge($this->offset, $offset);
	}

	public function getOffsetForOrientation($axis)
	{
		if (!in_array($axis, $this->axes)) {
			throw new InvalidArgumentException('Wrong axis provided for getOffsetForOrientation. Only x, y oder z allowed');
		}

		return array_diff_key($this->getOffset(), [$axis => '']);
	}

	public function getOrientation()
	{
		return $this->currentOrientation;
	}

	public function setOrientation($axis)
	{
		if (!in_array($axis, $this->axes)) {
			throw new InvalidArgumentException('Wrong axis provided for setOrientation. Only x, y oder z allowed');
		}
		$this->currentOrientation = $axis;
	}

	public function addOverlay(ImageVolume $overlay, $offset = null)
	{
		if ($this->hasOverlay($overlay)) {
			// TODO: what about different offsets?
			return;
		}
		if (!is_null($offset)) {
			$overlay->setOffset($offset);
		}
		$this->overlays[] = $overlay;
	}

	public function hasOverlay(ImageVolume $overlay)
	{
		$overlayId = $overlay->id;
		return count(array_filter($this->overlays, function ($overlay) use ($overlayId) {
			return $overlay->id === $overlayId;
		})) > 0;
	}

	public function numberOfOverlays()
	{
		return count($this->overlays);
	}

	public function getOverlays()
	{
		return $this->overlays;
	}

	public function merge(ImageVolume $image)
	{
		$copy = clone $this;

		if (!empty($image->currentWindow)) {
			$copy->currentWindow = $image->currentWindow;
		}

		if (!empty($image->currentOrientation)) {
			$copy->currentOrientation = $image->currentOrientation;
		}

		if (!empty($image->title)) {
			$copy->title = $image->title;
		}

		if (!$image->numberOfOverlays()) {
			return $copy;
		}

		foreach ($image->getOverlays() as $overlay) {
			$copy->addOverlay($overlay);
		}

		return $copy;
	}

	public function jsonSerialize()
	{
		return [
			'id' => $this->id,
			'title' => $this->title,
			'overlays' => array_map(function ($overlay) {
				return $overlay->getBaseTransportObject();
			}, $this->overlays),
			'orientation' => $this->getOrientation(),
			'dimensions' => $this->dimensions,
			'window' => $this->currentWindow,
			'slices' => $this->slices,
			'currentSlice' => $this->initialSlice,
		];
	}

	public function getHash()
	{
		$attributes = [
			'id' => $this->id,
			'overlays' => array_map(function ($overlay) {
				return $overlay->getBaseTransportObject();
			}, $this->overlays),
			'orientation' => $this->getOrientation(),
			'window' => $this->currentWindow,
		];
		return md5(json_encode($attributes));
	}

	public function getBaseTransportObject()
	{
		return [
			'id' => $this->id,
			'offset' => $this->offset,
			'dimensions' => $this->dimensions,
		];
	}

	public function getBaseTransportObjectForDimensions($axis)
	{
		return [
			'id' => $this->id,
			'offset' => $this->getOffsetForOrientation($axis),
			'dimensions' => $this->getDimensionsForOrientation($axis),
		];
	}
}
