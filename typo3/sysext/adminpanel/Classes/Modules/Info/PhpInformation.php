<?php
declare(strict_types = 1);

namespace TYPO3\CMS\Adminpanel\Modules\Info;

/*
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */

use TYPO3\CMS\Adminpanel\Modules\AbstractSubModule;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Fluid\View\StandaloneView;

/**
 * PhpInformation admin panel sub module
 */
class PhpInformation extends AbstractSubModule
{
    /**
     * @inheritdoc
     */
    public function getIdentifier(): string
    {
        return 'info_php';
    }

    /**
     * @inheritdoc
     */
    public function getLabel(): string
    {
        return $this->getLanguageService()->sL(
            'LLL:EXT:adminpanel/Resources/Private/Language/locallang_info.xlf:sub.php.label'
        );
    }

    /**
     * @inheritdoc
     */
    public function getContent(): string
    {
        $view = GeneralUtility::makeInstance(StandaloneView::class);
        $templateNameAndPath = 'EXT:adminpanel/Resources/Private/Templates/Modules/Info/PhpInfo.html';
        $view->setTemplatePathAndFilename(GeneralUtility::getFileAbsFileName($templateNameAndPath));
        $view->setPartialRootPaths(['EXT:adminpanel/Resources/Private/Partials']);

        $view->assignMultiple(
            [
                'general' => [
                    'PHP_VERSION' => PHP_VERSION,
                    'PHP_OS' => PHP_OS,
                    'PHP_SAPI' => PHP_SAPI,
                    'Peak Memory Usage' => memory_get_peak_usage(),
                ],
                'loadedExtensions' => implode(', ', get_loaded_extensions()),
                'constants' => get_defined_constants(true),
            ]
        );

        return $view->render();
    }
}
