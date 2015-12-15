<?php
use TYPO3\CMS\Backend\Controller;

/**
 * Definitions for routes provided by EXT:backend
 * Contains all AJAX-based routes for entry points
 *
 * Currently the "access" property is only used so no token creation + validation is made
 * but will be extended further.
 */
return [
    'rte_insert_image' => [
        'path' => '/rte/insert-image',
        'target' => \TYPO3\CMS\Rtehtmlarea\Controller\SelectImageController::class . '::buildImageMarkup',
    ],
];
