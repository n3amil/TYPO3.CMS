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

/**
 * Module: TYPO3/CMS/Backend/LayoutModule/DragDrop
 * this JS code does the drag+drop logic for the Layout module (Web => Page)
 * based on jQuery UI
 */
import * as $ from 'jquery';
import 'jquery-ui/droppable';
import DataHandler = require('../AjaxDataHandler');
import ResponseInterface from 'TYPO3/CMS/Backend/AjaxDataHandler/ResponseInterface';


interface Parameters {
  cmd?: { tt_content: { [key: string]: any } };
  data?: { tt_content: { [key: string]: any } };
  CB?: { paste: string, update: { colPos: number | boolean, sys_language_uid: number }};
}

interface DroppableEventUIParam {
    draggable: JQuery;
    helper: JQuery;
    position: { top: number; left: number; };
    offset: { top: number; left: number; };
}

class DragDrop {

  private static readonly contentIdentifier: string = '.t3js-page-ce';
  private static readonly dragIdentifier: string = '.t3-page-ce-dragitem';
  private static readonly dragHeaderIdentifier: string = '.t3js-page-ce-draghandle';
  private static readonly dropZoneIdentifier: string = '.t3js-page-ce-dropzone-available';
  private static readonly columnIdentifier: string = '.t3js-page-column';
  private static readonly validDropZoneClass: string = 'active';
  private static readonly dropPossibleHoverClass: string = 't3-page-ce-dropzone-possible';
  private static readonly addContentIdentifier: string = '.t3js-page-new-ce';
  private static originalStyles: string = '';

  /**
   * initializes Drag+Drop for all content elements on the page
   */
  public static initialize(): void {
    $(DragDrop.contentIdentifier).draggable({
      handle: DragDrop.dragHeaderIdentifier,
      scope: 'tt_content',
      cursor: 'move',
      distance: 20,
      // removed because of incompatible types:
      // addClasses: 'active-drag',
      revert: 'invalid',
      zIndex: 100,
      start: (evt: JQueryEventObject, ui: DroppableEventUIParam): void => {
        DragDrop.onDragStart($(evt.target));
      },
      stop: (evt: JQueryEventObject, ui: DroppableEventUIParam): void => {
        DragDrop.onDragStop($(evt.target));
      }
    });

    $(DragDrop.dropZoneIdentifier).droppable({
      accept: this.contentIdentifier,
      scope: 'tt_content',
      tolerance: 'pointer',
      over: (evt: JQueryEventObject, ui: DroppableEventUIParam): void => {
        DragDrop.onDropHoverOver($(ui.draggable), $(evt.target));
      },
      out: (evt: JQueryEventObject, ui: DroppableEventUIParam): void => {
        DragDrop.onDropHoverOut($(ui.draggable), $(evt.target));
      },
      drop: (evt: JQueryEventObject, ui: DroppableEventUIParam): void => {
        DragDrop.onDrop($(ui.draggable), $(evt.target), evt);
      }
    });
  }

  /**
   * called when a draggable is selected to be moved
   * @param $element a jQuery object for the draggable
   * @private
   */
  public static onDragStart($element: JQuery): void {
    // Add css class for the drag shadow
    DragDrop.originalStyles = $element.get(0).style.cssText;
    $element.children(DragDrop.dragIdentifier).addClass('dragitem-shadow');
    $element.append('<div class="ui-draggable-copy-message">' + TYPO3.lang['dragdrop.copy.message'] + '</div>');
    // Hide create new element button
    $element.children(DragDrop.dropZoneIdentifier).addClass('drag-start');
    $element.closest(DragDrop.columnIdentifier).removeClass('active');

    // TODO decide what to do with this
    // $element.parents(DragDrop.columnHolderIdentifier).find(DragDrop.addContentIdentifier).hide();
    $element.find(DragDrop.dropZoneIdentifier).hide();

    $(DragDrop.dropZoneIdentifier).each((index: number, element: HTMLElement): void => {
      const $me = $(element);
      if ($me.parent().find('.t3js-toggle-new-content-element-wizard').length) {
        $me.addClass(DragDrop.validDropZoneClass);
      } else {
        $me.closest(DragDrop.contentIdentifier)
          .find('> ' + DragDrop.addContentIdentifier + ', > > ' + DragDrop.addContentIdentifier).show();
      }
    });
  }

  /**
   * called when a draggable is released
   * @param $element a jQuery object for the draggable
   * @private
   */
  public static onDragStop($element: JQuery): void {
    // Remove css class for the drag shadow
    $element.children(DragDrop.dragIdentifier).removeClass('dragitem-shadow');
    // Show create new element button
    $element.children(DragDrop.dropZoneIdentifier).removeClass('drag-start');
    $element.closest(DragDrop.columnIdentifier).addClass('active');
    // TODO decide what to do with this
    // $element.parents(DragDrop.columnHolderIdentifier).find(DragDrop.addContentIdentifier).show();
    $element.find(DragDrop.dropZoneIdentifier).show();
    $element.find('.ui-draggable-copy-message').remove();

    // Reset inline style
    $element.get(0).style.cssText = DragDrop.originalStyles;

    $(DragDrop.dropZoneIdentifier + '.' + DragDrop.validDropZoneClass).removeClass(DragDrop.validDropZoneClass);
  }

  /**
   * adds CSS classes when hovering over a dropzone
   * @param $draggableElement
   * @param $droppableElement
   * @private
   */
  public static onDropHoverOver($draggableElement: JQuery, $droppableElement: JQuery): void {
    if ($droppableElement.hasClass(DragDrop.validDropZoneClass)) {
      $droppableElement.addClass(DragDrop.dropPossibleHoverClass);
    }
  }

  /**
   * removes the CSS classes after hovering out of a dropzone again
   * @param $draggableElement
   * @param $droppableElement
   * @private
   */
  public static onDropHoverOut($draggableElement: JQuery, $droppableElement: JQuery): void {
    $droppableElement.removeClass(DragDrop.dropPossibleHoverClass);
  }

  /**
   * this method does the whole logic when a draggable is dropped on to a dropzone
   * sending out the request and afterwards move the HTML element in the right place.
   *
   * @param $draggableElement
   * @param $droppableElement
   * @param {Event} evt the event
   * @private
   */
  public static onDrop($draggableElement: number | JQuery, $droppableElement: JQuery, evt: JQueryEventObject): void {
    const newColumn = DragDrop.getColumnPositionForElement($droppableElement);

    $droppableElement.removeClass(DragDrop.dropPossibleHoverClass);
    const $pasteAction = typeof $draggableElement === 'number';

    // send an AJAX requst via the AjaxDataHandler
    const contentElementUid: number = $pasteAction === true ?
      <number>$draggableElement :
      parseInt((<JQuery>$draggableElement).data('uid'), 10);

    if (typeof(contentElementUid) === 'number' && contentElementUid > 0) {
      let parameters: Parameters = {};
      // add the information about a possible column position change
      const targetFound = $droppableElement.closest(DragDrop.contentIdentifier).data('uid');
      // the item was moved to the top of the colPos, so the page ID is used here
      let targetPid = 0;

      if (typeof targetFound === 'undefined') {
        // the actual page is needed
        targetPid = $('[data-page]').first().data('page');
      } else {
        // the negative value of the content element after where it should be moved
        targetPid = 0 - parseInt(targetFound, 10);
      }

      const language = parseInt($droppableElement.closest('[data-language-uid]').data('language-uid'), 10);
      let colPos: number | boolean = 0;
      if (targetPid !== 0) {
        colPos = newColumn;
      }
      parameters.cmd = {tt_content: {}};
      parameters.data = {tt_content: {}};

      const copyAction = (evt && (<JQueryInputEventObject>evt.originalEvent).ctrlKey || $droppableElement.hasClass('t3js-paste-copy'));
      if (copyAction) {
        parameters.cmd.tt_content[contentElementUid] = {
          copy: {
            action: 'paste',
            target: targetPid,
            update: {
              colPos: colPos,
              sys_language_uid: language
            }
          }
        };
        // TODO Make sure we actually have a JQuery object here, not only cast it
        DragDrop.ajaxAction($droppableElement, <JQuery>$draggableElement, parameters, copyAction, $pasteAction);
      } else {
        parameters.data.tt_content[contentElementUid] = {
          colPos: colPos,
          sys_language_uid: language
        };
        if ($pasteAction) {
          parameters = {
            CB: {
              paste: 'tt_content|' + targetPid,
              update: {
                colPos: colPos,
                sys_language_uid: language
              }
            }
          };
        } else {
          parameters.cmd.tt_content[contentElementUid] = {move: targetPid};
        }
        // fire the request, and show a message if it has failed
        DragDrop.ajaxAction($droppableElement, <JQuery>$draggableElement, parameters, copyAction, $pasteAction);
      }
    }
  }

  /**
   * this method does the actual AJAX request for both, the move and the copy action.
   *
   * @param $droppableElement
   * @param $draggableElement
   * @param parameters
   * @param $copyAction
   * @param $pasteAction
   * @private
   */
  public static ajaxAction($droppableElement: JQuery, $draggableElement: JQuery, parameters: Parameters,
                           $copyAction: boolean, $pasteAction: boolean): void {
    DataHandler.process(parameters).done(function(result: ResponseInterface): void {
      if (result.hasErrors) {
        return;
      }

      // insert draggable on the new position
      if (!$pasteAction) {
        if (!$droppableElement.parent().hasClass(DragDrop.contentIdentifier.substring(1))) {
          $draggableElement.detach().css({top: 0, left: 0})
            .insertAfter($droppableElement.closest(DragDrop.dropZoneIdentifier));
        } else {
          $draggableElement.detach().css({top: 0, left: 0})
            .insertAfter($droppableElement.closest(DragDrop.contentIdentifier));
        }
      }
      self.location.reload(true);
    });
  }

  /**
   * returns the next "upper" container colPos parameter inside the code
   * @param $element
   * @return int|null the colPos
   */
  public static getColumnPositionForElement($element: JQuery): number | boolean {
    const $columnContainer = $element.closest('[data-colpos]');
    if ($columnContainer.length && $columnContainer.data('colpos') !== 'undefined') {
      return $columnContainer.data('colpos');
    } else {
      return false;
    }
  }
}

export default DragDrop;

$(DragDrop.initialize);
