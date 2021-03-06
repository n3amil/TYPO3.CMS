<?php
declare(strict_types = 1);

namespace TYPO3\CMS\Adminpanel\Service;

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

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Adminpanel\Modules\AdminPanelModuleInterface;
use TYPO3\CMS\Backend\FrontendBackendUserAuthentication;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\SingletonInterface;

/**
 * Admin Panel Service Class for Configuration Handling
 *
 * Scope: User TSConfig + Backend User UC
 */
class ConfigurationService implements SingletonInterface
{
    /**
     * @var array
     */
    protected $mainConfiguration;

    public function __construct()
    {
        $this->mainConfiguration = $this->getBackendUser()->getTSConfig('admPanel')['properties'];
    }

    /**
     * Get MainConfiguration (User TSConfig admPanel)
     *
     * @return array
     */
    public function getMainConfiguration(): array
    {
        return $this->mainConfiguration;
    }

    /**
     * Helper method to return configuration options
     * Checks User TSConfig overrides and current backend user session
     *
     * @param string $identifier
     * @param string $option
     * @return string
     */
    public function getConfigurationOption(string $identifier, string $option): string
    {
        if ($identifier === '' || $option === '') {
            throw new \InvalidArgumentException('Identifier and option may not be empty', 1532861423);
        }

        if (isset($this->mainConfiguration['override.'][$identifier . '.'][$option])) {
            $returnValue = $this->mainConfiguration['override.'][$identifier . '.'][$option];
        } else {
            $returnValue = $this->getBackendUser()->uc['TSFE_adminConfig'][$identifier . '_' . $option] ?? '';
        }

        return (string)$returnValue;
    }

    /**
     * Save admin panel configuration to backend user UC
     * triggers onSubmit method of modules to enable each module
     * to enhance the save action
     *
     * @param AdminPanelModuleInterface[] $modules
     * @param ServerRequestInterface $request
     * @throws \TYPO3\CMS\Core\Cache\Exception\NoSuchCacheException
     */
    public function saveConfiguration(array $modules, ServerRequestInterface $request): void
    {
        $configurationToSave = $request->getParsedBody()['TSFE_ADMIN_PANEL'] ?? [];
        $beUser = $this->getBackendUser();

        // Trigger onSubmit
        foreach ($modules as $module) {
            if ($module->isEnabled()) {
                $module->onSubmit($configurationToSave, $request);
                foreach ($module->getSubModules() as $subModule) {
                    $subModule->onSubmit($configurationToSave, $request);
                }
            }
        }
        // Settings
        $beUser->uc['TSFE_adminConfig'] = array_merge(
            !is_array($beUser->uc['TSFE_adminConfig']) ? [] : $beUser->uc['TSFE_adminConfig'],
            $configurationToSave
        );
        unset($beUser->uc['TSFE_adminConfig']['action']);
        // Saving
        $beUser->writeUC();
    }

    /**
     * Returns the current BE user.
     *
     * @return BackendUserAuthentication|FrontendBackendUserAuthentication
     */
    protected function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }
}
