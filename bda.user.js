// ==UserScript==
// @name         Better Dynamo Administration JTRO
// @namespace    BetterDynAdminJTRO
// @include      */dyn/admin/*
// @author       Jean-Charles Manoury
// @contributor  Benjamin Descamps
// @contributor  Joël Trousset
// @homepageURL  https://github.com/jc7447/BetterDynAdmin
// @supportURL   https://github.com/jc7447/BetterDynAdmin/issues
// @description  Refreshing ATG Dyn Admin
// @grant GM_getResourceText
// @grant GM_addStyle
// @grant window.focus
// @grant GM_setClipboard
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_deleteValue
//
// ------ write version on bdaCSS TOO ! ------
// @version 1.16.jtro.0
// @resource bdaCSS https://raw.githubusercontent.com/jc7447/BetterDynAdmin/master/bda.css?version=1.16.jtro.0

// @require https://code.jquery.com/jquery-1.11.1.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.21.5/js/jquery.tablesorter.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/codemirror/4.8.0/codemirror.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/codemirror/4.8.0/mode/xml/xml.min.js
// @require https://raw.githubusercontent.com/vkiryukhin/vkBeautify/master/vkbeautify.js
// @require https://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.8.0/highlight.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/select2/3.5.2/select2.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/vis/4.15.0/vis.min.js
// @resource cmCSS https://cdnjs.cloudflare.com/ajax/libs/codemirror/3.20.0/codemirror.css
// @resource tablesorterCSS https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.21.5/css/theme.blue.min.css
// @resource hljsThemeCSS https://raw.githubusercontent.com/jc7447/BetterDynAdmin/master/lib/highlight.js/github_custom.css
// @resource hlCSS https://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.8.0/styles/default.min.css
// @resource select2CSS https://raw.githubusercontent.com/jc7447/BetterDynAdmin/master/lib/select2/select2.css
// @resource select2BootCSS https://cdnjs.cloudflare.com/ajax/libs/select2-bootstrap-css/1.4.6/select2-bootstrap.css
// @resource fontAwsomeCSS https://raw.githubusercontent.com/jc7447/BetterDynAdmin/master/lib/font-awsome/font-awesome.min.css
// @resource visCSS https://cdnjs.cloudflare.com/ajax/libs/vis/4.15.0/vis.min.css
// @resource whatsnew https://raw.githubusercontent.com/jc7447/BetterDynAdmin/master/WHATSNEW.md
// @updateUrl   https://raw.githubusercontent.com/troussej/BetterDynAdmin/master/bda.user.js
// @downloadUrl   https://raw.githubusercontent.com/troussej/BetterDynAdmin/master/bda.user.js

// ==/UserScript==

$(document).ready(function(){

  try{

    var BDA = {
    MAP_SEPARATOR : "=",
    LIST_SEPARATOR : ",",
        componentBrowserPageSelector : "h1:contains('Component Browser')",
        descriptorTableSelector : "table:eq(0)",
        repositoryViewSelector : "h2:contains('Examine the Repository, Control Debugging')",
        cacheUsageSelector : "h2:contains('Cache usage statistics')",
        propertiesSelector : "h1:contains('Properties')",
        eventSetsSelector : "h1:contains('Event Sets')",
        methodsSelector : "h1:contains('Methods')",
        resultsSelector : "h2:contains('Results:')",
        errorsSelector1 : "p:contains('Errors:')",
        errorsSelector2 : "code:contains('*** Query:')",
        logoSelector : "div#oracleATGbrand",
        oldDynamoAltSelector : ["Dynamo Component Browser", "Dynamo Administration", "Performance Monitor", "Dynamo Batch Compiler", "Dynamo Configuration", "JDBC Browser"],
        defaultItemByTab : "10",
        hasWebStorage : false,
        hasErrors : false,
        hasResults : false,
        isRepositoryPage : false,
        isOldDynamo : false,
        isComponentPage : false,
        isPerfMonitorPage : false,
        isPerfMonitorTimePage : false,
        isXMLDefinitionFilePage : false,
        isServiceConfigurationPage : false,
        isExecuteQueryPage : false,
        xmlDefinitionMaxSize : 150000, // 150 Ko
    xmlDefinitionCacheTimeout : 1200, // 20min
        queryEditor : null,
        descriptorList : null,
        connectionPoolPointerComp : "/atg/dynamo/admin/jdbcbrowser/ConnectionPoolPointer/",
        dataSourceDir : "/atg/dynamo/service/jdbc/",
        dynAdminCssUri : "/dyn/admin/atg/dynamo/admin/admin.css",
        GMValue_MonoInstance: "monoInstance",
        GMValue_Backup:"backup",
        nbItemReceived : 0,
        itemTree : new Map(),
        startGettingTree : 0,
        defaultDescriptor : { "OrderRepository"          : "order",
                              "CsrRepository"            : "returnRequest",
                              "ProfileAdapterRepository" : "user",
                              "ProductCatalog"           : "sku",
                              "InventoryRepository"      : "inventory",
                              "PriceLists"               : "price"
                             },
        $pipelineDef : null,
        network : null,
        options : {
                         width : "100%",
                         height: "550px",
                         interaction : {
                            zoomView : true,
                            selectable : true,
                            dragNodes : false,
                            dragView : true,
                            hover : false
                         },
                        layout : {
                             hierarchical : {
                               direction : "LR",
                               sortMethod : "directed",
                               nodeSpacing : 300,
                               levelSeparation : 250
                           }
                         },
                         edges: {
                            smooth: {
                                type: 'cubicBezier',
                                forceDirection: 'horizontal',
                                roundness: 0.4
                            },
                          },
                          nodes: {
                            font : {
                              size : 11
                            },
                            shape : "box"
                          },
                          physics:false
                       },
        STORED_CONFIG : "BdaConfiguration",
        CACHE_STAT_TITLE_REGEXP : /item-descriptor=(.*) cache-mode=(.*) cache-locality=(.*)/,
        isLoggingTrace : false,


        init : function(){
          var start = new Date().getTime();
          console.log("Start BDA script");
          this.loadExternalCss();
          this.hasErrors = this.hasErrorsFct();
          this.hasResults = this.hasResultsFct(this.hasErrors);
          this.isOldDynamo = this.isOldDynamoFct();
          this.isPerfMonitorPage = this.isPerfMonitorPageFct();
          this.isPerfMonitorTimePage = this.isPerfMonitorTimePageFct();
          this.isXMLDefinitionFilePage = this.isXMLDefinitionFilePageFct();
          this.isServiceConfigurationPage = this.isServiceConfigurationPageFct();
          this.isExecuteQueryPage = this.isExecuteQueryPageFct();
          this.isComponentPage = this.isComponentPageFct();
          this.isActorChainPage = this.isActorChainPageFct();
          this.hasWebStorage = this.hasWebStorageFct();
          this.isRepositoryPage = this.isRepositoryPageFct();
          this.isPipelineManagerPage = this.isPipelineManagerPageFct();

          console.log("isPerfMonitorPage : " + this.isPerfMonitorPage + ", isPerfMonitorTimePage : " + this.isPerfMonitorTimePage);
          if (this.isOldDynamo) {
            this.logoSelector = "";
          for (var i = 0; i != this.oldDynamoAltSelector.length; i++)
            {
              if(i !== 0)
               this.logoSelector += ",";
              this.logoSelector += "img[alt='" + this.oldDynamoAltSelector[i] + "']";
            }
            console.log("OldDynamo logoSelector :" + this.logoSelector);
            this.fixCss();
          }

          console.log("Path : " + this.purgeSlashes($(location).attr('pathname')));
          console.log("isComponentPage : " + this.isComponentPage + " IsOldDynamo : " + this.isOldDynamo);
          console.log("isRepositoryPage : " + this.isRepositoryPage + " Page has results : " + this.hasResults + ". Page has errors : " + this.hasErrors);
          console.log("BDA monoInstance mode : " + (GM_getValue(BDA.GMValue_MonoInstance) === true));

          $.tablesorter.defaults.sortInitialOrder = 'desc';

          if(GM_getValue(BDA.GMValue_MonoInstance) === true)
            BDA.restoreData(GM_getValue(BDA.GMValue_Backup), false);

          // Setup repository page
          if (this.isRepositoryPage)
            this.setupRepositoryPage();
          else if (this.isXMLDefinitionFilePage)
            this.setupRepositoryDefinitionFilePage();
          else if (this.isServiceConfigurationPage)
            this.setupServiceConfigurationPage();

          // Setup performance monitor
          if (this.isPerfMonitorPage)
            this.setupPerfMonitorPage();
          // Setup performance monitor time page
          if (this.isPerfMonitorTimePage)
            this.setupPerfMonitorTimePage();
          // Setup JDBC browser execute query
          if (this.isExecuteQueryPage)
            this.setupExecuteQueryPage();

          this.showComponentHsitory();
          this.reloadData();
          this.createMenu();

          if (this.isComponentPage)
          {
            // Change page title
            this.setupPageTitle();
            // Setup find class link
            this.setupFindClassLink();
            // Collect history
            this.collectHistory();
            // Make search field visible
            $("#search").css("display", "inline");
            if(this.isPipelineManagerPage)
              this.setupPipelineManagerPage();
          }
          else if (this.isActorChainPage)
              this.createActorCaller();

          // Handle escape key press
          $(document).keyup(function(e) {
            if (e.keyCode == 27) {
              // Close add component pop-up
              $('.popup_block').fadeOut();
              // Close panels
              if ($("#bdaBackupPanel").css("display") != "none")
              {
                $("#bdaBackupPanel").slideToggle();
                BDA.rotateArrow($(".backupArrow i"));
              }
              if ($("#bdaBugPanel").css("display") != "none")
              {
                $("#bdaBugPanel").slideToggle();
                BDA.rotateArrow($(".backupArrow i"));
              }
           }
          });

          // Monitor execution time
          var endTime = new Date();
          var time = endTime.getTime() - start;
          if (time > 1000)
            console.log("BDA takes : " + (time / 1000) + "sec");
          else
            console.log("BDA takes : " + time + "ms");
        },

        removeAdminLink : function()
        {
          var $componentBrowserH1 = $(this.componentBrowserPageSelector);
          if ($componentBrowserH1.size() > 0)
          {
            $componentBrowserH1.prev().remove();
            $(this.logoSelector).click(function (){
              window.location.href = "/dyn/admin";
            });
          }
        },

        loadExternalCss : function(url)
        {
          var cmCSS = GM_getResourceText("cmCSS");
          GM_addStyle(cmCSS);
          var hlCSS = GM_getResourceText("hlCSS");
          GM_addStyle(hlCSS);
          var hljsThemeCSS = GM_getResourceText("hljsThemeCSS");
          GM_addStyle(hljsThemeCSS);
          var tablesorterCSS = GM_getResourceText("tablesorterCSS");
          GM_addStyle(tablesorterCSS);
          var fontAwsomeCSS = GM_getResourceText("fontAwsomeCSS");
          GM_addStyle(fontAwsomeCSS);
          var select2CSS = GM_getResourceText("select2CSS");
          GM_addStyle(select2CSS);
          var select2BootCSS = GM_getResourceText("select2BootCSS");
          GM_addStyle(select2BootCSS);
          var bdaCSS = GM_getResourceText("bdaCSS");
          GM_addStyle(bdaCSS);
          var visCSS = GM_getResourceText("visCSS");
          GM_addStyle(visCSS);
        },

        //--- Page informations ------------------------------------------------------------------------
        isPerfMonitorPageFct : function()
        {
          return $(location).attr('pathname').indexOf("performance-monitor.jhtml") != -1;
        },

        isPerfMonitorTimePageFct : function()
        {
          return $(location).attr('pathname').indexOf("performance-data-time.jhtml") != -1;
        },

        isExecuteQueryPageFct : function()
        {
          return $(location).attr('pathname').indexOf("executeQuery.jhtml") != -1;
        },

        isOldDynamoFct : function ()
        {
          for(var els = document.getElementsByTagName ('img'), i = els.length; i--;)
          {
            if (BDA.oldDynamoAltSelector.indexOf(els[i].alt) != -1)
              return true;
          }
          return false;
        },

        // Load default dyn admin CSS if needed
        fixCss : function()
        {
          if ($("link[href='" + this.dynAdminCssUri + "']").size() === 0)
          {
            console.log("Default dyn admin CSS is missing : " + this.dynAdminCssUri + ". Add it now.");
            var $link = $("<link />")
            .prop("href", this.dynAdminCssUri)
            .prop("type", "text/css")
            .prop("rel", "stylesheet");
            if($('head').size > 0)
              $('head').append($link);
            else
              $('body').append($link);
          }
        },

        hasResultsFct : function (hasErrors)
        {
          return $(this.resultsSelector).size() > 0;
        },

        hasErrorsFct : function ()
        {
          return $(this.errorsSelector1).size() > 0 || $(this.errorsSelector2).size() > 0;
        },

        hasWebStorageFct : function ()
        {
          if(typeof(Storage) !== "undefined")
            return true;
          return false;
        },

        isRepositoryPageFct : function ()
        {
          return $("h2:contains('Run XML Operation Tags on the Repository')").size() > 0;
        },

        isXMLDefinitionFilePageFct : function()
        {
          return $("td:contains('class atg.xml.XMLFile')").size() > 0
          || $("td:contains('class [Latg.xml.XMLFile;')").size() > 0;
        },

        isServiceConfigurationPageFct : function()
        {
          return location.search.indexOf("propertyName=serviceConfiguration") != -1;
        },

        isComponentPageFct : function ()
        {
          return $("h1:contains('Directory Listing')").size() === 0 //Page is not a directory
          && document.URL.indexOf('/dyn/admin/nucleus/') != -1 // Page is in nucleus browser
          && document.URL.indexOf("?") == -1; // Page has no parameter
        },

        isActorChainPageFct : function()
        {
            return $("h2:contains('Actor Chain:')").size() == 1 && document.URL.indexOf('chainId=') != -1;
        },

        isPipelineManagerPageFct : function()
        {
            return $("h2:contains('Pipeline Chains')").size() === 1;
        },

        rotateArrow : function ($arrow)
        {
          if ($arrow.hasClass("fa-arrow-down"))
            $arrow.removeClass("fa-arrow-down").addClass("fa-arrow-up");
          else
            $arrow.removeClass("fa-arrow-up").addClass("fa-arrow-down");
        },

        rotateArrowQuarter : function ($arrow)
        {
          if ($arrow.hasClass("fa-arrow-down"))
            $arrow.removeClass("fa-arrow-down").addClass("fa-arrow-right");
          else
            $arrow.removeClass("fa-arrow-right").addClass("fa-arrow-down");
        },

        //---- Repository page -------------------------------------------------------------------------

        getToggleLabel : function(state)
        {
          if(state == 1)
            return "Show less...";
          return "Show more...";
        },

        toggleShowLabel : function (contentDisplay,selector)
        {
          if (contentDisplay == "none")
            $(selector).html("Show more...");
          else
            $(selector).html("Show less...");
        },

        toggleCacheUsage: function ()
        {
          var $cacheUsage = $(this.cacheUsageSelector);
          $cacheUsage.next().toggle().next().toggle();
          this.toggleShowLabel($cacheUsage.next().css("display"), "#showMoreCacheUsage");
          this.storeToggleState("showMoreCacheUsage", $cacheUsage.next().css("display"));
        },

        toggleRepositoryView : function ()
        {
          $(this.repositoryViewSelector).next().toggle().next().toggle();
          this.toggleShowLabel($(this.repositoryViewSelector).next().css("display"), "#showMoreRepositoryView");
          this.storeToggleState("showMoreRepositoryView", $(this.repositoryViewSelector).next().css("display"));
        },

        toggleProperties : function ()
        {
          $(this.propertiesSelector).next().toggle();
          this.toggleShowLabel($(this.propertiesSelector).next().css("display"), "#showMoreProperties");
          this.storeToggleState("showMoreProperties", $(this.propertiesSelector).next().css("display"));
        },

        toggleEventSets : function ()
        {
          $(this.eventSetsSelector).next().toggle();
          this.toggleShowLabel($(this.eventSetsSelector).next().css("display"), "#showMoreEventsSets");
          this.storeToggleState("showMoreEventsSets", $(this.eventSetsSelector).next().css("display"));
        },

        toggleMethods : function ()
        {
          $(this.methodsSelector).next().toggle();
          this.toggleShowLabel($(this.methodsSelector).next().css("display"), "#showMoreMethods");
          this.storeToggleState("showMoreMethods", $(this.methodsSelector).next().css("display"));
        },

        toggleRawXml : function ()
        {
          $("#rawXml").toggle();
          if ($("#rawXml").css("display") == "none")
            $("#rawXmlLink").html("show raw XML");
          else
            $("#rawXmlLink").html("hide raw XML");
        },

        getDescriptorList : function()
        {
          if (this.descriptorList)
            return this.descriptorList;
          var descriptors = [];
          $("#descriptorTable tr th:first-child:not([colspan])")
          .sort(function(a, b){
            return $(a).text().toLowerCase() > $(b).text().toLowerCase() ? 1 : -1;
          }).each(function() {

            descriptors.push($(this).html().trim());
          });
          this.descriptorList = descriptors;
          return descriptors;
        },

        getDescriptorOptions: function ()
        {
          var descriptorOptions = "";
          var descriptors = this.getDescriptorList();
          descriptorOptions = "";
          var defaultDesc = this.defaultDescriptor[this.getComponentNameFromPath(this.getCurrentComponentPath())];
          if (defaultDesc === undefined)
            descriptorOptions = "<option></option>";
          for (var i = 0; i != descriptors.length; i++)
          {
            descriptorOptions += "<option value='" + descriptors[i] + "'";
            if (defaultDesc === descriptors[i])
              descriptorOptions += "selected='selected'";
            descriptorOptions +=  ">" + descriptors[i] + "</option>\n";
          }
          return descriptorOptions;
        },

        getsubmitButton : function ()
        {
          return "<button type='button' id='RQLAdd'>Add</button>"
          + "<button type='button' id='RQLGo'>Add & Enter <i class='fa fa-play fa-x'></i></button>";
        },

        getPrintItemEditor : function ()
        {
          $("#itemIdField").show();
          $("#itemDescriptorField").show();
          $("#idOnlyField").hide();
        },

        getAddItemEditor: function()
        {
          $("#itemIdField").hide();
          $("#itemDescriptorField").show();
          $("#idOnlyField").hide();
        },

        getRemoveItemEditor : function ()
        {
          this.getPrintItemEditor();
        },

        getRemoveItemsEditor : function ()
        {
          this.getPrintItemEditor();
        },

        getUpdateItemEditor : function ()
        {
          this.getPrintItemEditor();
        },

        getQueryItemsEditor : function ()
        {
          $("#itemIdField").hide();
          $("#itemDescriptorField").show();
          $("#idOnlyField").show();
        },

        getMultiId : function()
        {
          var ids = $("#itemId").val().trim();
          if (ids.indexOf(",") != -1)
            return ids.split(",");
          return [ids];
        },

        getPrintItemQuery : function ()
        {
          var ids = this.getMultiId();
          var descriptor = $("#itemDescriptor").val();
          var query = "";
          for (var i = 0; i != ids.length; i++)
            query += "<print-item id=\"" + ids[i].trim() + "\" item-descriptor=\"" + descriptor + "\" />\n";
          return query;
        },

        getRemoveItemQuery : function ()
        {
          var ids = this.getMultiId();
          var descriptor = $("#itemDescriptor").val();
          var query = "";
          for (var i = 0; i != ids.length; i++)
            query += "<remove-item id=\"" + ids[i].trim() + "\" item-descriptor=\"" + descriptor + "\" />\n";
          return query;
        },

        getAddItemQuery : function ()
        {
          var descriptor = $("#itemDescriptor").val();
          var query = "<add-item item-descriptor=\"" + descriptor + "\" >\n";
          query += "  <set-property name=\"\"><![CDATA\[]]></set-property>\n";
          query += "</add-item>\n";
          return query;
        },

        getUpdateItemQuery : function ()
        {
          var descriptor = $("#itemDescriptor").val();
          var ids = this.getMultiId();
          var query = "";
          for (var i = 0; i != ids.length; i++)
          {
            query += "<update-item id=\"" + ids[i] + "\" item-descriptor=\"" + descriptor + "\" >\n";
            query += "  <set-property name=\"\"><![CDATA\[]]></set-property>\n";
            query += "</update-item>\n";
          }
          return query;
        },

        getQueryItemsQuery : function ()
        {
          var descriptor = $("#itemDescriptor").val();
          var idOnly = $("#idOnly").prop('checked');
          var query = "<query-items item-descriptor=\"" + descriptor + "\" id-only=\"" + idOnly + "\">\n\n";
          query += "</query-items>\n";
          return query;
        },

        getAllItemQuery : function ()
        {
          var descriptor = $("#itemDescriptor").val();
          var idOnly = $("#idOnly").prop('checked');
          var query = "<query-items item-descriptor=\"" + descriptor + "\" id-only=\"" + idOnly + "\">\n";
          query += "ALL\n";
            query += "</query-items>\n";
          return query;
        },

        getLast10ItemQuery : function ()
        {
          var descriptor = $("#itemDescriptor").val();
          var idOnly = $("#idOnly").prop('checked');
          var query = "<query-items item-descriptor=\"" + descriptor + "\" id-only=\"" + idOnly + "\">\n";
          query += "ALL ORDER BY ID DESC RANGE 0+10\n";
            query += "</query-items>\n";
          return query;
        },

        getRQLQuery : function ()
        {
          var query = "";
          var action = $("#RQLAction").val();
          console.log("getRQLQuery : " + action);
          if (action == "print-item")
            query = this.getPrintItemQuery();
          else if (action == "query-items")
            query = this.getQueryItemsQuery();
          else if (action == "remove-item")
            query = this.getRemoveItemQuery();
          else if (action == "add-item")
            query = this.getAddItemQuery();
          else if (action == "update-item")
            query = this.getUpdateItemQuery();
          else if (action == "all")
            query = this.getAllItemQuery();
          else if (action == "last_10")
            query = this.getLast10ItemQuery();
          return query;
        },

        submitRQLQuery : function (addText)
        {
          if(addText)
          {
            var query = this.getRQLQuery();
            this.setQueryEditorValue(this.getQueryEditorValue() + query);
          }
          this.sanitizeQuery();
          this.storeSplitValue();
          // set anchor to the result div
          location.hash = '#RQLResults';
          $("#RQLForm").submit();
        },

        sanitizeQuery : function()
        {
          var query = this.getQueryEditorValue();
          this.setQueryEditorValue(query.replace(/repository\=\".+\"/gi, ""));
        },

        setQueryEditorValue :function(value)
        {
          this.queryEditor.getDoc().setValue(value);
        },

        getQueryEditorValue : function()
        {
          return this.queryEditor.getDoc().getValue();
        },

        showTextField : function (baseId)
        {
          baseId = this.sanitizeSelector(baseId);
          $("#" + baseId).toggle();
          $("#text_" + baseId).toggle();
        },

        // Escape '.', ':' in a jquery selector
        sanitizeSelector : function( id ) {
          return id.replace( /(:|\.|\[|\]|,)/g, "\\$1" );
        },

        endsWith : function (str, suffix)
        {
          return str.indexOf(suffix, str.length - suffix.length) !== -1;
        },

        purgeXml : function (xmlContent)
        {
          var xmlStr = "";
          var lines = xmlContent.split("\n");
          for (var i = 0; i != lines.length; i++)
          {
            var line = lines[i].trim();
            if (!(line.substr(0,1) == "<" && this.endsWith(line, ">")))
              xmlStr += line + "\n";
          }
          return xmlStr;
        },

        sanitizeXml : function (xmlContent)
        {
          var start = new Date().getTime();

          var regexp = /<\!--(.*)(<set\-property.*><\!\[CDATA\[[\S\s]*?\]\]\><\/set\-property\>).*-->/ig;
          var xmlStr =  xmlContent.replace(regexp, function(str, p1, p2, offset, s){
            var attributes = "set-property ";
            if (p1.indexOf("derived") != -1)
              attributes += "derived=\"true\" ";
            if (p1.indexOf("rdonly") != -1)
              attributes += "rdonly=\"true\" ";
            if (p1.indexOf("export") != -1)
              attributes += "export=\"true\" ";

            var newLine = p2.replace("set-property", attributes);
            return newLine;
          });
          var endTime = new Date();
          var time = endTime.getTime() - start;
          console.log("time to sanitize : " + time + "ms");
          return xmlStr;
        },

    // Check if the given property contains id(s) with the given item descriptor
    // Return an item descriptor name if the property is an ID,
    // Return null if the property is not found,
    // Return "FOUND_NOT_ID" is the property is found but is not an ID
     isPropertyId : function(propertyName, $itemDesc)
     {
       var isId = null;
       var propertyFound = false;
       $itemDesc.find("property[name=" + propertyName + "]").each(function() {
         propertyFound = true;
         $property = $(this);
       if ($property.attr("item-type") !== undefined && $property.attr("repository") === undefined)
         isId = $property.attr("item-type");
       else if  ($property.attr("component-item-type") !== undefined && $property.attr("repository") === undefined)
         isId = $property.attr("component-item-type");
     });
     if (propertyFound && isId === null)
      return "FOUND_NOT_ID";
     return isId;
     },
    // Check if the given property contains id(s) with the given repository definition
    // Only ID from the current repository are take in account
    // Return the item descriptor name if the type if an ID, null otherwise
    isTypeId : function(propertyName, itemDesc, $xmlDef)
    {
      var isId = null;
      if ($xmlDef !== null)
      {
          var $itemDesc = $xmlDef.find("item-descriptor[name='" + itemDesc + "']");
          // First check in current item desc
          isId = BDA.isPropertyId(propertyName, $itemDesc);
          // In case we found the property but it's not an ID, we don't want to seach in super-type
          if (isId == "FOUND_NOT_ID")
            return null;
          // In case we found the property and it's an ID
          if (isId !== null)
            return isId;
          // Now we check in each super-type item desc
          var superType = $itemDesc.attr("super-type");
          while(superType !== undefined && isId === null)
          {
            var $parentDesc = $xmlDef.find("item-descriptor[name='" + superType + "']");
            //console.log("Search in super type : " + $parentDesc.attr("name"));
            isId = BDA.isPropertyId(propertyName, $parentDesc);
            superType = $parentDesc.attr("super-type");
          }
          if (isId == "FOUND_NOT_ID")
            return null;
      }
      //console.log("Property : " + propertyName + " of item " + itemDesc + " is ID : " + isId);
      return isId;
    },

    // Parse the given repository ID into a tab, each index will contains an ID or a separator : "," or "="
    parseRepositoryId : function(id)
    {
      var idAsTab = [];
      var tab;
      // Splice by MAP_SEPARATOR
      if (id.indexOf(BDA.MAP_SEPARATOR) !== -1)
      {
        tab = id.split(BDA.MAP_SEPARATOR);
        idAsTab[0] = tab[0];
        idAsTab[1] = BDA.MAP_SEPARATOR;
        idAsTab[2] = tab[1];
      }
      else
        idAsTab[0] = id;

      // Splice by LIST_SEPARATOR
      var toAdd = [];
      var toRemove = [];
      for(var i = 0 ; i != idAsTab.length; i++)
      {
        if (idAsTab[i].indexOf(BDA.LIST_SEPARATOR) != -1)
        {
          toRemove.push(i);
          tab = idAsTab[i].split(BDA.LIST_SEPARATOR);
          for(var a = 0 ; a != tab.length; a++)
          {
            if (a !== 0)
              toAdd.push(BDA.LIST_SEPARATOR);
            toAdd.push(tab[a]);
          }
        }
      }
      // purge tab
      for(var b = 0 ; b != toRemove.length; b++)
        idAsTab.splice(toRemove[b], 1);
      // Merge isAsTab and tAdd
      Array.prototype.push.apply(idAsTab, toAdd);
      return idAsTab;
    },

    renderProperty : function(curProp, propValue, itemId, isItemTree)
    {
      var html = "";
      if (propValue !== null && propValue !== undefined)
      {
        // Remove "_"
        if(curProp.name == "descriptor")
          propValue = propValue.substr(1);
          // propertyName_id
        var base_id = curProp.name + "_" + itemId;

        if (curProp.name == "id")
          html += "<td id='" + base_id + "'>" + propValue + "</td>";
       else if (propValue.length > 25)
        {
          var link_id = "link_" + base_id;
          var field_id = "text_" + base_id;
          propValue = "<a class='copyLink' href='javascript:void(0)' title='Show all' id='" + link_id + "' >"
          + "<span id='" + base_id + "'>" + this.escapeHTML(propValue.substr(0, 25)) + "...</a>"
          + "</span><textarea class='copyField' id='" + field_id + "' readonly>" + propValue + "</textarea>";
          html += "<td>" + propValue + "</td>";
        }
        else if (curProp.isId === true)
        {
            propValue = BDA.parseRepositoryId(propValue);
            html += "<td>";
            for (var b = 0; b != propValue.length; b++)
            {
              if (propValue[b] != BDA.MAP_SEPARATOR && propValue[b] != BDA.LIST_SEPARATOR)
              {
                if (isItemTree) // for item tree we create an anchor link
                  html += "<a class='clickable_property' href='#id_" + propValue[b] + "'>" + propValue[b] + "</a>";
                else
                  html += "<a class='clickable_property loadable_property' data-id='" + propValue[b] + "' data-descriptor='" + curProp.itemDesc + "'>" + propValue[b] + "</a>";
              }
              else
                html += propValue[b];
            }
          html += "</td>";
        }
        else
          html += "<td>" + propValue + "</td>";
      }
      else
      {
        html += "<td>&nbsp;</td>";
        //console.log("propValue not found : " + curProp.name + ", descriptor : " + itemDesc);
      }
      return html;
    },

    renderTab : function (types, datas, tabId, isItemTree)
        {
        
          var html = "";
          html += "<table class='dataTable' ";
          if (isItemTree)
            html += "id='" + tabId + "'";
          html += ">";
          for (var i = 0; i != types.length; i++)
          {
            var curProp = types[i];
            if (i % 2 === 0)
              html += "<tr class='even'>";
            else
              html += "<tr class='odd'>";
            html += "<th>" + curProp.name + "<span class='prop_name'>";
            if (curProp.rdonly == "true")
              html += "<div class='prop_attr prop_attr_red'>R</div>";
            if (curProp.derived  == "true")
              html += "<div class='prop_attr prop_attr_green'>D</div>";
            if (curProp.exportable  == "true")
              html += "<div class='prop_attr prop_attr_blue'>E</div>";
            html += "</span></th>";

            for (var a = 0; a < datas.length; a++)
            {
              var propValue = datas[a][curProp.name];
              html += this.renderProperty(curProp, propValue, datas[a].id, isItemTree);
            }
            html += "</tr>";
          }
          html += "</table>";
          return html;
        },

        showXMLAsTab : function(xmlContent, $xmlDef, $outputDiv, isItemTree)
        {
          var xmlDoc = $.parseXML("<xml>" + xmlContent  + "</xml>");
          var $xml = $(xmlDoc);
          var $addItems = $xml.find("add-item");
          var types = {};
          var datas = [];
          var nbTypes = 0;
          var typesNames = {};

          var log = $("<xml>" + xmlContent  + "</xml>")
          .children()
          .remove()
          .end()
          .text()
          .trim();

          $addItems.each(function () {
            var curItemDesc = "_" + $(this).attr("item-descriptor");
            if (!types[curItemDesc])
              types[curItemDesc] = [];
            if (!typesNames[curItemDesc])
              typesNames[curItemDesc] = [];
            if (!datas[curItemDesc])
            {
              datas[curItemDesc] = [];
              nbTypes++;
            }
            var curData = {};

            $(this).find("set-property").each(function (index) {

              var $curProp = $(this);
              curData[$curProp.attr("name")] = $curProp.text();
              var type = {};
              type.name = $curProp.attr("name");
              if ($.inArray(type.name, typesNames[curItemDesc]) == -1 )
              {
                type.rdonly = $curProp.attr("rdonly");
                type.derived = $curProp.attr("derived");
                type.exportable = $curProp.attr("exportable");

            var typeItemDesc = BDA.isTypeId(type.name, curItemDesc.substr(1), $xmlDef);
            if (typeItemDesc === null)
              type.isId = false;
            else
            {
              type.isId = true;
              type.itemDesc = typeItemDesc;
            }
                types[curItemDesc].push(type);
                typesNames[curItemDesc].push(type.name);
              }
            });
            if ($.inArray("descriptor", typesNames[curItemDesc]) == -1)
            {
              var typeDescriptor = {};
              typeDescriptor.name = "descriptor";
              types[curItemDesc].unshift(typeDescriptor);
              typesNames[curItemDesc].push("descriptor");
            }
            if ($.inArray("id", typesNames[curItemDesc]) == -1)
            {
              var typeId = {};
              typeId.name = "id";
              types[curItemDesc].unshift(typeId);
              typesNames[curItemDesc].push("id");
            }
            curData.descriptor = curItemDesc;
            curData.id = $(this).attr("id");
            datas[curItemDesc].push(curData);
          });
          var startRenderingtab = new Date().getTime();
          var html = "<p class='nbResults'>" + $addItems.size() + " items in " + nbTypes + " descriptor(s)</p>";
          var splitValue;
          var splitObj = this.getStoredSplitObj();
          if (splitObj === undefined || splitObj === null || splitObj.activeSplit === true)
            splitValue = 0;
          else
            splitValue = parseInt(splitObj.splitValue);
          for(var itemDesc in datas)
          {
          if (splitValue === 0)
              splitValue = datas[itemDesc].length;
            var nbTab = 0;

            if (datas[itemDesc].length <= splitValue)
            {
              html += this.renderTab(types[itemDesc], datas[itemDesc], itemDesc.substr(1), isItemTree);
            }
            else
            {
              while ((splitValue * nbTab) <  datas[itemDesc].length)
              {
                var start = splitValue * nbTab;
                var end = start + splitValue;
                if (end > datas[itemDesc].length)
                  end = datas[itemDesc].length;
                var subDatas = datas[itemDesc].slice(start, end);
                html += this.renderTab(types[itemDesc], subDatas, itemDesc + "_" + nbTab, isItemTree);
                nbTab++;
              }
            }
          }
          $outputDiv.append(html);
          $outputDiv.prepend("<div class='prop_attr prop_attr_red'>R</div> : read-only "
              + "<div class='prop_attr prop_attr_green'>D</div> : derived "
              + "<div class='prop_attr prop_attr_blue'>E</div> : export is false");

          if ($(".copyField").size() > 0)
          {
            // reuse $outputDiv in case we have several results set on the page (RQL query + get item tool)
            $outputDiv.find("p.nbResults").append("<br><a href='javascript:void(0)' class='showFullTextLink'>Show full text</a>");
            $outputDiv.find(".showFullTextLink").click(function() {
              var dateStart = new Date().getTime();
              console.log("Start showFullText");
              $(".copyField").each(function() {
                $(this).parent().html($(this).html());
              });
              var dateFullText = new Date();
              console.log("time to show full text : " + (dateFullText.getTime() - dateStart) + "ms");
              $(this).hide();
            });
          }

      $(".loadable_property").click(function() {
        var $elm = $(this);
        var id = $elm.attr("data-id");
        var itemDesc = $elm.attr("data-descriptor");
        var query = "<print-item id='" + id + "' item-descriptor='" + itemDesc + "' />\n";
        if (confirm("You are about to add this query and reload the page : \n" + query))
        {
          BDA.setQueryEditorValue(BDA.getQueryEditorValue() + query);
          $("#RQLForm").submit();
        }
      });

      if (isItemTree)
            BDA.createSpeedbar();

          var endRenderingTab = new Date();
          var time = endRenderingTab.getTime() - startRenderingtab;
          console.log("time to render tab : " + time + "ms");
          return log;
        },

        showRQLLog : function (log, error)
        {
          console.log("Execution log : " + log);
        if (log && log.length > 0)
          {
            $("<h3>Execution log</h3><div id='RQLLog'></div>").insertAfter("#RQLResults");
            var cleanLog = log.replace(/\n{2,}/g, '\n').replace(/------ /g, "").trim();
            $("#RQLLog").html(cleanLog);
          }
          if(error)
            $("#RQLLog").addClass("error");
        },

        showRQLResults : function ()
        {
          console.log("Start showRQLResults");
          // Add 'show raw xml' link
          var html = "<p>"
                    + "<a href='javascript:void(0)' id='rawXmlLink'>Show raw xml</a>"
                    + "</p>\n";
          html += "<p id='rawXml'></p>";
          $("#RQLResults").append(html);

          var xmlContent = $(this.resultsSelector).next().text().trim();
          xmlContent = this.sanitizeXml(xmlContent);
  
        BDA.processRepositoryXmlDef("definitionFiles", function($xmlDef){
        var log = BDA.showXMLAsTab(xmlContent, $xmlDef, $("#RQLResults"), false);
        BDA.showRQLLog(log, false);
        // Move raw xml
        $(BDA.resultsSelector).next().appendTo("#rawXml");
        $(BDA.resultsSelector).remove();

        $("#rawXmlLink").click(function() {
          BDA.toggleRawXml();
          var xmlSize = $("#rawXml pre").html().length;
          console.log("raw XML size : " + xmlSize);
          console.log("XML max size : " + BDA.xmlDefinitionMaxSize);
          if (xmlSize < BDA.xmlDefinitionMaxSize)
          {
            $('#rawXml').each(function(i, block) {
              hljs.highlightBlock(block);
            });
          }
          else
          {
            // Check if button already exists
            if ($("#xmlHighlight").size() === 0)
            {
              $("<p id='xmlHighlight' />")
              .html("The XML result is big, to avoid slowing down the page, XML highlight have been disabled. "
                  + "<br> <button id='xmlHighlightBtn'>Highlight XML now</button> <small>(takes few seconds)</small>")
              .prependTo($("#rawXml"));
              $("#xmlHighlightBtn").click(function() {
                $('#rawXml pre').each(function(i, block) {
                  hljs.highlightBlock(block);
                });
              });
            }
          }
        });

        $(".copyLink").click(function() {
          BDA.showTextField($(this).attr("id").replace("link_", ""));
        });
    });
        },

        showRqlErrors : function ()
        {
          var error = "";
          if ($(this.errorsSelector1).size() > 0)
          {
            console.log("Case of error  : 1");
            error = $(this.errorsSelector1).next().text();
            $(this.resultsSelector).next().remove();
            $(this.resultsSelector).remove();
            $(this.errorsSelector1).next().remove();
            $(this.errorsSelector1).remove();
          }
          else
          {
            console.log("Case of error  : 2");
            error = $(this.errorsSelector2).text();
          }
          error = this.purgeXml(error);
          this.showRQLLog(error, true);
        },

        getStoredSplitObj : function ()
        {
          if(!this.hasWebStorage)
            return null;
          return JSON.parse(localStorage.getItem('splitObj'));
        },

        escapeHTML : function (s)
        {
          return String(s).replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        },

        setupRepositoryDefinitionFilePage : function()
        {
          var xmlSize = 0;
          $("pre").each(function(index) {
            xmlSize += $(this).html().length;
          });
          console.log("Xml size : " + xmlSize);
          if (xmlSize < this.xmlDefinitionMaxSize)
          {
            this.highlightAndIndentXml($("pre"));

          }
          else
          {
            $("<p />")
            .html("The definition file is big, to avoid slowing down the page, XML highlight and indentation have been disabled. <br>"
                + "<button id='xmlHighlightBtn'>Highlight and indent now</button> <small>(takes few seconds)</small>")
            .insertAfter($("h3:contains('Value')"));

            $("#xmlHighlightBtn").click(function() {
              BDA.highlightAndIndentXml($("pre"));
            });
          }
        },

        propertiesDef : function(hljs) {
          console.log("propertiesDef");
            return {
              case_insensitive: true,
              contains: [
                 {
                   className: 'comment',
                   begin: '#', end: '$'
                 },
                 {
                   className: 'setting',
                   begin: '^[a-z0-9\\[\\]_-]+[ \\t]*=[ \\t]*', end: '$',
                   contains: [
                     {
                       className: 'value',
                       endsWithParent: true,
                       keywords: 'on off true false yes no',
                       contains: [hljs.QUOTE_STRING_MODE, hljs.NUMBER_MODE],
                       relevance: 0
                     }
                   ]
                 }
              ]
            };
        },


        setupServiceConfigurationPage : function()
        {
          console.log("setupServiceConfigurationPage");
          hljs.registerLanguage("properties",
              function(hljs) {
            console.log(hljs);
            return {
              cI: true,
              c: [
                 {
                   cN: 'comment',
                   b: '#',
                   e: '$'
                 },
                 {
                   cN: 'setting',
                   b: /^[$a-z0-9\[\]_-]+\s*=\s*/,
                   e: '$',
                   c: [
                       {
                       cN: 'value',
                       eW: !0,
                       c: [
                           {
                             cN: 'number',
                             b: '\\b\\d+(\\.\\d+)?',
                             r: 10
                           },
                           {
                             cN: 'string',
                             b : /[./a-z0-9\[\]_-]+/,
                             e: '$',
                             r: 0
                           }
                          ],
                       r: 0
                     }
                   ]
                 }
              ]
            };
          });
          $('pre').each(function() {
            var txt = $(this).html();
            $(this).text("");
            $("<code class='properties' />").appendTo($(this)).html(txt);

          });
          $('pre code').each(function(i, block) {
            hljs.highlightBlock(block);
          });
        },

        highlightAndIndentXml : function($elm)
        {
          var dateStart = new Date().getTime();
          console.log("Start highlightAndIndentXml");

          $elm.each(function(index) {
            var escapeXML = $(this).html();
            var unescapeXML = $('<div/>').html(escapeXML).text();
            // vkbeautify needs unescape XML to works
            unescapeXML = vkbeautify.xml(unescapeXML, 2);
            var dateIndent = new Date();
            console.log("time to indent : " + (dateIndent.getTime() - dateStart) + "ms");
            var $codeBlock = $(this)
            // remove previous XML content
            .empty()
            // add code tags
            .append("<code class='xml'></code>")
            .find("code")
            // set escape XML content, because highlight.js needs escape XML to works
            .text(unescapeXML);

            // Run highlight.js on each XML block
            console.log($codeBlock.get(0));
            hljs.highlightBlock($codeBlock.get(0));
            // Make component path clickable
            $codeBlock.find("span.hljs-attribute:contains('jndi'), span.hljs-attribute:contains('repository')")
            .each(function() {
              var $value = $(this).next();
              var url = "/dyn/admin/nucleus" + $value.text().replace(/\"/g, "");
              $value.wrap("<a target='_blank' class='clickable' href='" + url + "' ></a>");
              $value.append("<i class='fa fa-external-link'></i>");
            });
          });

          var dateEnd = new Date();
          var time = dateEnd.getTime() - dateStart;
          console.log("time to highlight and indent : " + time + "ms");
        },

        setupRepositoryPage : function ()
        {
          // Move RQL editor to the top of the page
          var actionSelect = "<select id='RQLAction' class='js-example-basic-single' style='width:170px'>"
            + " <optgroup label='Empty queries'>"
            + "<option value='print-item'>print-item</option>"
            + "<option value='query-items'>query-items</option>"
            + "<option value='remove-item'>remove-item</option>"
            + "<option value='add-item'>add-item</option>"
            + "<option value='update-item'>update-item</option>"
            + "</optgroup>"
            + " <optgroup label='Predefined queries'>"
            + "<option value='all'>query-items ALL</option>"
            + "<option value='last_10'>query-items last 10</option>"
            + "</optgroup>"
            + "</select>";

          $(this.descriptorTableSelector).attr("id", "descriptorTable");

          $("<div id='RQLEditor'></div>").insertBefore("h2:first");
          $("<div id='RQLResults'></div>").insertBefore("#RQLEditor");
          if (this.hasErrors)
            this.showRqlErrors();
          if (this.hasResults && !this.hasErrors)
            this.showRQLResults();

          $("form:eq(1)").appendTo("#RQLEditor");
          $("form:eq(1)").attr("id", "RQLForm");
          var $children = $("#RQLForm").children();
          $("#RQLForm").empty().append($children);
          $("textarea[name=xmltext]").attr("id", "xmltext");
          $("<div id='RQLToolbar'></div>").insertBefore("#RQLEditor textarea");

          $("#RQLToolbar").append("<div> Action : "+ actionSelect
              + " <span id='editor'>"
              + "<span id='itemIdField' >ids : <input type='text' id='itemId' placeholder='Id1,Id2,Id3' /></span>"
              + "<span id='itemDescriptorField' > descriptor :  <select id='itemDescriptor' class='itemDescriptor' >" + this.getDescriptorOptions() + "</select></span>"
              + "<span id='idOnlyField' style='display: none;'><label for='idOnly'>&nbsp;id only : </label><input type='checkbox' id='idOnly'></input></span>"
              + "</span>"
              + this.getsubmitButton() + "</div>");


          $("#RQLAction").select2({
            width : "style",
            minimumResultsForSearch: -1
          });

          $("#RQLToolbar").after("<div id='RQLText'></div>");
          $("#xmltext").appendTo("#RQLText");
          $("#RQLText").after("<div id='storedQueries'></div>");
          $("#RQLText").after("<div id='descProperties'></div>");
          $("#RQLForm input[type=submit]").remove();

          var splitObj = this.getStoredSplitObj();
          var itemByTab = this.defaultItemByTab;
          var isChecked = false;
          if (splitObj)
          {
            itemByTab = splitObj.splitValue;
            isChecked = splitObj.activeSplit;
          }
          var checkboxSplit =  "<input type='checkbox' id='noSplit' ";
          if (isChecked)
            checkboxSplit += " checked ";
          checkboxSplit += "/> don't split.";

          $("#storedQueries").after("<div id='RQLSave'>"
             + "<div style='display:inline-block;width:200px'><button id='clearQuery' type='button'>Clear <i class='fa fa-ban fa-x'></i></button></div>"
             + "<div style='display:inline-block;width:530px'>Split tab every :  <input type='text' value='" + itemByTab + "' id='splitValue'> items. "
             + checkboxSplit + "</div>"
             + "<button type='submit' id='RQLSubmit'>Enter <i class='fa fa-play fa-x'></i></button>"
             + "</div>"
             + "<div><input placeholder='Name this query' type='text' id='queryLabel'>&nbsp;<button type='button' id='saveQuery'>Save <i class='fa fa-save fa-x'></i></button></div>"
             );

          this.showQueryList();
          this.queryEditor = CodeMirror.fromTextArea(document.getElementById("xmltext"), {lineNumbers: false});
          this.setupItemTreeForm();
          this.setupItemDescriptorTable();
          this.setupPropertiesTables();

          $(".itemDescriptor").select2({
            placeholder: "Select a descriptor",
            allowClear: false,
            width : "element",
            matcher: function (params, data) {
              // If there are no search terms, return all of the data
              if ($.trim(params) === '') {
                return data;
              }
              data = data.toUpperCase();
              params = params.toUpperCase();
              // `params.term` should be the term that is used for searching
              // `data.text` is the text that is displayed for the data object
              if(data.indexOf(params) != -1)
                  return true;
              return false;
            }
          });
          $("#itemDescriptor").on("select2-selecting", function(e){
            BDA.showItemPropertyList(e.val);
          });

          $("#RQLAction").change(function() {
            var action = $(this).val();
            console.log("Action change : " + action);
            if (action == "print-item")
              BDA.getPrintItemEditor();
            else if (action == "query-items")
              BDA.getQueryItemsEditor();
            else if (action == "remove-item")
              BDA.getRemoveItemEditor();
            else if (action == "add-item")
              BDA.getAddItemEditor();
            else if (action == "update-item")
              BDA.getUpdateItemEditor();
            else
              BDA.getQueryItemsEditor();
          });

          $("#RQLSubmit").click(function() {
            BDA.submitRQLQuery(false);
          });

          $("#RQLGo").click(function() {
            BDA.submitRQLQuery(true);
          });

          $("#RQLAdd").click(function() {
            var query = BDA.getRQLQuery();
            var editor = BDA.queryEditor;
            var editorCursor = editor.getCursor();
            if(editorCursor.ch !==  0)
              editor.setCursor(editor.getCursor().line + 1, 0);

            BDA.queryEditor.replaceSelection(query);
          });

          $("#saveQuery").click(function() {
            if (BDA.getQueryEditorValue().trim().length > 0 && $("#queryLabel").val().trim().length > 0)
            {
              BDA.storeRQLQuery($("#queryLabel").val().trim(), BDA.getQueryEditorValue().trim());
              BDA.showQueryList();
            }
          });

          $("#clearQuery").click(function() {
            BDA.setQueryEditorValue("");
          });

          //cache section

      BDA.setupRepositoryCacheSection();

          // Hide other sections
          var toggleObj = BDA.getToggleObj();

          var repositoryView  = "<a href='javascript:void(0)' id='showMoreRepositoryView' class='showMore'>" + this.getToggleLabel(toggleObj.showMoreRepositoryView) + "</a>";
          var cacheUsage  = "&nbsp;<a href='javascript:void(0)' id='showMoreCacheUsage' class='showMore'>" + this.getToggleLabel(toggleObj.showMoreCacheUsage) + "</a>";
          var properties  = "&nbsp;<a href='javascript:void(0)' id='showMoreProperties' class='showMore'>" + this.getToggleLabel(toggleObj.showMoreProperties) + "</a>";
          var eventSets  = "&nbsp;<a href='javascript:void(0)' id='showMoreEventsSets' class='showMore'>" + this.getToggleLabel(toggleObj.showMoreEventsSets) + "</a>";
          var methods  = "&nbsp;<a href='javascript:void(0)' id='showMoreMethods' class='showMore'>" + this.getToggleLabel(toggleObj.showMoreMethods) + "</a>";

          // Auto hide Repository View
          $(this.repositoryViewSelector).append(repositoryView);

          if (toggleObj.hasOwnProperty("showMoreRepositoryView") && toggleObj.showMoreRepositoryView == 0)
            this.toggleRepositoryView();
          $("#showMoreRepositoryView").click(function (){
            BDA.toggleRepositoryView();
          });
          // Auto hide Cache usage
          $(this.cacheUsageSelector).append(cacheUsage);
          if (toggleObj.showMoreCacheUsage != 1)
            this.toggleCacheUsage();
          $("#showMoreCacheUsage").click(function (){
            BDA.toggleCacheUsage();
          });
          // Auto hide Properties
          $(this.propertiesSelector).append(properties);
          if (toggleObj.showMoreProperties != 1)
            this.toggleProperties();
          $("#showMoreProperties").click(function (){
            BDA.toggleProperties();
          });
          // Auto hide Events Sets
          $(this.eventSetsSelector).append(eventSets);
          if (toggleObj.showMoreEventsSets != 1)
            this.toggleEventSets();
          $("#showMoreEventsSets").click(function (){
            BDA.toggleEventSets();
          });
          // Auto hide Methods
          $(this.methodsSelector).append(methods);
          if (toggleObj.showMoreMethods != 1)
            this.toggleMethods();
          $("#showMoreMethods").click(function (){
            BDA.toggleMethods();
          });
        },

        toggleCacheLines : function (){
          $tr = $(this);
          $tr.toggleClass('collapsed');
          $tr.toggleClass('expanded');
          $tr.next().toggle();
          $tr.next().next().toggle();
          BDA.rotateArrowQuarter($tr.find('.cacheArrow i'));
        },


        setupRepositoryCacheSection : function(){

          try{

          var start = new Date().getTime();

          var $cacheUsage = $(this.cacheUsageSelector);
          var $cacheTable = $cacheUsage.next().next().find('table');
          var size = $cacheTable.find('th').first().find('th').length;

          var index = -1;
          $cacheTable.find('tr').each(function(){
            var $tr = $(this);
            if(index % 3 == 0){
              //highlight per item
               $tr.addClass('odd cache expanded');

               var $td = $tr.find('td').first();
               $td.attr('colspan',23)

               //$td.insert($arrow);

              //enhance the title line
              var $b = $td.find('b:contains("item-descriptor")');
              var text = $b.html();

              var match = BDA.CACHE_STAT_TITLE_REGEXP.exec(text);
              var itemDesc = match[1];
              var cacheMode = match[2];
              var cacheLocality = match[3];
              var newText = '<span> item-descriptor=<b>'+itemDesc+'</b> cache-mode=<b>'+cacheMode+'</b> cache-locality=<b>'+cacheLocality+'</b></span>';

              $arrow = $('<span class="cacheArrow"><i class="up fa fa-arrow-down"></i></span>');
              $td.html($arrow);
              $td.append(newText);

              //collapse items
              $tr.bind('click',BDA.toggleCacheLines);

            }

            index++;
           });

           //collapse all button
           $resetLink =  $cacheUsage.next();

           $expandAll = $('<button></button>',{
              id : 'cacheExpandAll',
              class :'cache expand',
              value : 'expandAll',
              html: 'Expand All'
           })
           .bind('click',function(){
              $cacheTable.find('tr.odd.cache.collapsed').each(BDA.toggleCacheLines);
           })
           .appendTo($resetLink)
           ;

           $collapseAll = $('<button></button>',{
              id : 'collapseAll',
              class :'cache collapse',
              value : 'collapseAll',
              html: 'Collapse All'
           })
           .bind('click',function(){
              $cacheTable.find('tr.odd.cache.expanded').each(BDA.toggleCacheLines);
           })
           .appendTo($resetLink)
           .click() //start all collapsed
           ;

           var end = new Date().getTime();
           console.log('setupRepositoryCacheSection took ' + (end - start) + 'ms');
         }catch(err){
          console.log(err);
         }

        },

        getToggleObj : function ()
        {
          if(!this.hasWebStorage)
            return {};

          var toggleObj = localStorage.getItem('toggleObj');
      if (toggleObj && toggleObj.length > 0)
            toggleObj = JSON.parse(toggleObj);
          else
            toggleObj = {};
          return toggleObj;
        },

        storeToggleState : function(toggle, cssState)
        {
          if(!this.hasWebStorage)
            return;
          var toggleState = 1;
          if(cssState == "none")
            toggleState = 0;
          var toggleObj = BDA.getToggleObj();
          toggleObj[toggle] = toggleState;
          BDA.storeItem('toggleObj', JSON.stringify(toggleObj));
        },

        showItemPropertyList : function(item)
        {
          console.log("showItemPropertyList");
          var componentURI = window.location.pathname;
          var url = componentURI + "?action=seetmpl&itemdesc=" + item + "#showProperties";
          $.get(url, function(data) {
            var $pTable = $(data).find("a[name='showProperties']").next();
            $pTable.find('th:nth-child(2), td:nth-child(2),th:nth-child(4), td:nth-child(4),th:nth-child(5), td:nth-child(5),th:nth-child(6), td:nth-child(6)').remove();
            $("#storedQueries").css("display", "none");
            var $scrollDiv = $("<div class='scrollableTab'></div>").append($pTable);
            $("#descProperties")
            .empty()
            .append($scrollDiv)
            .append("<p class='showQueriesLabel'><a href='javascript:void(0)' id='showStoredQueries'>Show stored queries</a></p>")
            .css("display", "inline-block");

            $("#showStoredQueries").click(function() {
              console.log("show stored queries");
              $("#descProperties").css("display", "none");
              $("#storedQueries").css("display", "inline-block");
            });

          });
        },

        setupPageTitle : function()
        {
          $("title").text(this.getComponentNameFromPath(this.getCurrentComponentPath()));
        },

        setupFindClassLink : function()
        {
          var $classLink = null;
          if (this.isOldDynamo)
            $classLink = $("h1:eq(0)").next();
          else
           $classLink = $("h1:eq(1)").next();
          var className = $classLink.text();
          $("<span style='margin-left : 25px'><a href='/dyn/admin/atg/dynamo/admin/en/findclass.jhtml?className="+className+"&debug=true'>Find Class</a></span>")
          .insertAfter($classLink);
        },

        setupPropertiesTables : function()
        {
          if ($("a[name=showProperties]").size() > 0)
          {
            $("a[name=showProperties]").next().attr("id", "propertiesTable");
            $("#propertiesTable").find("tr:nth-child(odd)").addClass("odd");
          }
        },

        setupItemDescriptorTable : function ()
        {
          var descriptors = this.getDescriptorList();
          var componentURI = window.location.pathname;
          var splitValue = 20;
          var html = "<p>" + descriptors.length + " descriptors available.</p>";
          html += "<div>";
          for (var i = 0; i != descriptors.length; i++)
          {
        if (i === 0 || i % splitValue === 0)
            {
              html += "<table class='descriptorTable'>";
              html += "<th>Descriptor</th>";
              html += "<th>View</th>";
              html += "<th>Debug</th>";
            }
            if (i % 2 === 0)
              html += "<tr class='even'>";
            else
              html += "<tr class='odd'>";
            var isDebugEnable = false;
            if ($("a[href='" + componentURI + "?action=clriddbg&itemdesc=" + descriptors[i] + "#listItemDescriptors']").size() > 0)
              isDebugEnable = true;
            html += "<td class='descriptor'>" + descriptors[i] + "</td>";
            html += "<td><a class='btn-desc' href='" + componentURI + "?action=seetmpl&itemdesc=" + descriptors[i] + "#showProperties'>Properties</a>";
            html += "&nbsp;<a class='btn-desc' class='btn-desc' href='" + componentURI + "?action=seenamed&itemdesc=" + descriptors[i] + "#namedQuery'>Named queries</a></td>";

            html += "<td>";
            if (isDebugEnable)
              html += "<a class='btn-desc red' href='" + componentURI + "?action=clriddbg&itemdesc=" + descriptors[i] + "#listItemDescriptors'>Disable</a>";
            else
            {
              html += "<a class='btn-desc' href='" + componentURI + "?action=setiddbg&itemdesc=" + descriptors[i] + "#listItemDescriptors'>Enable</a>";
              html += "&nbsp;<a class='btn-desc' href='" + componentURI + "?action=dbgprops&itemdesc=" + descriptors[i] + "#debugProperties'>Edit</a>";
            }
            html += "</td>";
            html += "</tr>";
            if (i !== 0 && ((i + 1) % splitValue === 0 || i + 1 === descriptors.length))
              html += "</table>";
          }
          html += "</div>";
          html += "<div style='clear:both' />";

          $("#descriptorTable").remove();
          $(html).insertAfter("a[name='listItemDescriptors']");
        },

        setupPipelineManagerPage : function()
        {
          //create diagram container
          $("h2:contains('Pipeline Chains')").append("<div class='popup_block' id='pipelinePopup'>"
                                                     + "<div><a href='javascript:void(0)' class='close'><i class='fa fa-times'></div>"
                                                     + "<div><h3></h3></div></i></a>"
                                                     + "<button id='schemeOrientation'>Switch orientation <i class='fa fa-retweet'></button>"
                                                     + "<div id='pipelineScheme'></div></div>");
          $("#pipelinePopup .close").click(function() {
            $("#pipelinePopup").fadeOut();
          });

          var $pipelineTable = $("h2:contains('Pipeline Chains')").next().attr("id", "pipelineTable");
          $pipelineTable.find("tr:nth-child(odd)").addClass("odd");
          $pipelineTable.find("tr:first").append("<th>Show XML</th><th>Show graph</th>");
          $pipelineTable.find("tr:gt(0)").append("<td align='center'><i class='fa fa-code link'></i></td><td align='center'><i class='fa fa-eye link'></i><sup style='font-size:8px'>&nbsp;BETA</sup></td>");
          //process pipeline definition file
          BDA.processRepositoryXmlDef("definitionFile", function($xmlDef){
              BDA.$pipelineDef = $xmlDef;
              $pipelineTable.find('tr').each(function(index, elem){
                  var $elem = $(elem);
                  var chainName = $elem.find("td:eq(0)").text();
                  $elem.attr("id", chainName);
                  $elem.find("td:eq(7)").click(function() {
                    $td = $(this);
                    if ($td.hasClass("open"))
                    {
                      $td.removeClass("open");
                      BDA.hidePipelineXml(chainName);
                    }
                    else
                    {
                      $td.addClass("open");
                      BDA.showPipelineXml(chainName, $elem.hasClass("odd"));
                    }
                  });

                  $elem.find("td:eq(8)").click(function() {
                    // Redset direction
                    BDA.options.layout.hierarchical.direction = "LR";
                    BDA.showPipelineGraph(chainName);
                  });
              });
          });
        },

        hidePipelineXml : function(chainName)
        {
          var trId = "xml_" + chainName;
          $("#" + trId).remove();
        },

        showPipelineXml : function(chainName, isOdd)
        {
          console.log("Show pipeline XML for chain : " + chainName + " isOdd : " + isOdd);
          var trId = "xml_" + chainName;

          if ($("#" + trId).size() === 0) {
            var xml = BDA.$pipelineDef.find("pipelinechain[name=" + chainName + "]")[0].outerHTML;
            var $codeBlock = $("<tr id='" + trId + "'><td colspan='9'><pre></pre></td></tr>")
            .insertAfter("#" + chainName)
            .find("pre")
            .text(xml);
            if (isOdd)
              $("#" + trId).addClass("odd");
            BDA.highlightAndIndentXml($codeBlock);
          }
        },

        showPipelineGraph : function(chainName)
        {
          console.log("Show pipeline graph for chain : " + chainName);
          $("#pipelinePopup h3").text(chainName);
          $("#pipelinePopup").show();
          var container = document.getElementById('pipelineScheme');
          var data = BDA.createNodesAndEdges(chainName);

          BDA.drawGraph(container, data);

          $('#schemeOrientation').unbind( "click" );
          $('#schemeOrientation').click(function(){
            console.log("Swith orientation, current : " + BDA.options.layout.hierarchical.direction);
            BDA.network.destroy();
            if(BDA.options.layout.hierarchical.direction === "LR")
                BDA.options.layout.hierarchical.direction = "UD";
            else
                BDA.options.layout.hierarchical.direction = "LR";
            console.log("Swith orientation, new : " + BDA.options.layout.hierarchical.direction);
            BDA.drawGraph(container, data);
          });
        },

        drawGraph : function(container, data) {
           // Actually renders into container
            BDA.network = new vis.Network(container, data, BDA.options);
            // Make node clickable
            BDA.network.on("click", function (params) {
              console.log("click on the network");
              console.log(params);
              var id = params.nodes[0];
              if (id !== undefined)
              {
                console.log(data.nodes.get(id).pipelineLinkPath);
                var url = "/dyn/admin/nucleus/" + data.nodes.get(id).pipelineLinkPath;
                window.open(url, '_blank');
              }
              else
                console.log("Not clicked on a node");
            });
        },

        createNodesAndEdges : function(chainName)
        {
          var $chainDef = BDA.$pipelineDef.find('pipelinechain[name=' + chainName + ']');
          var nodes = new vis.DataSet();
          var edges = new vis.DataSet();
          $chainDef.find('pipelinelink').each(function(pipelinelinkIndex, pipelinelinkElement){
              var pipelineLinkName = $(pipelinelinkElement).attr('name');
              console.log("link : "  + pipelineLinkName);
              var processor = $(pipelinelinkElement).find('processor');
              var pipelineLinkPath = $(processor).attr('jndi');
              if(pipelineLinkPath === undefined)
                  pipelineLinkPath = $(processor).attr('class');
             nodes.add({id : pipelinelinkIndex, label : pipelineLinkName, name : pipelineLinkName, pipelineLinkPath : pipelineLinkPath});
            });

            $chainDef.find('pipelinelink').each(function(pipelinelinkIndex, pipelinelinkElement)
            {
              var pipelineLinkName = $(pipelinelinkElement).attr('name');
              $(pipelinelinkElement).find('transition').each(function() {
                var transitionName = $(this).attr("link");
                edges.add({from : BDA.findNodeId(nodes, pipelineLinkName), to : BDA.findNodeId(nodes, transitionName), arrows : 'to', label : $(this).attr("returnvalue")});
              });

            });

          console.log({"edges" : edges, "nodes" : nodes});
          return {"edges" : edges, "nodes" : nodes};
        },

        findNodeId : function(nodes, name)
        {
          var id;
           nodes.forEach(function(nodeElement, nodeIndex){
             if (nodeElement.name == name)
             {
               id = nodeElement.id;
               return ;
             }
           });
            return id;
        },

        showQueryList : function ()
        {
          var html = "";
          if (this.hasWebStorage)
          {
            var rqlQueries = this.purgeRQLQuery(this.getStoredRQLQueries());
            if (rqlQueries && rqlQueries.length > 0)
            {
              html += "<span class='storedQueriesTitle'>Stored queries :</span>";
              html += "<ul>";
                for (var i = 0; i != rqlQueries.length; i++)
                {
                  var storeQuery = rqlQueries[i];
                  var escapedQuery =  $("<div>").text(storeQuery.query).html();

                  html += "<li class='savedQuery'>";
                  html += "<a href='javascript:void(0)'>" + storeQuery.name + "</a>";
                  html += "<span id='previewQuery" + i + "'class='previewQuery'>";
                  html += "<i class='fa fa-eye'></i>";
                  html += "</span>";
                  html += "<span id='deleteQuery" + i + "'class='deleteQuery'>";
                  html += "<i class='fa fa-trash-o'></i>";
                  html += "</span>";
                  html += "<span id='queryView" + i + "'class='queryView'>";
                  html += "<pre>" + escapedQuery + "</pre>";
                  html += "</span>";
                  html += "</li>";
                }
              html += "</ul>";
            }
          }
          $("#storedQueries").html(html);

          $('#storedQueries .queryView').each(function(i, block) {
            hljs.highlightBlock(block);
          });

          $(".savedQuery").click(function() {
            console.log("click on query : " + $(this).find("a").html());
            BDA.printStoredQuery( $(this).find("a").html());
          });

          $(".previewQuery").hover( function() {
            $(this).parent("li").find("span.queryView").toggle();
          }, function() {
            $(this).parent("li").find("span.queryView").toggle();
          });

          $(".deleteQuery")
          .click(function() {
            var index = this.id.replace("deleteQuery", "");
            console.log("Delete query #" + index);
            BDA.deleteRQLQuery(index);
            BDA.reloadQueryList();
          });
        },

        //--- Stored configuration functions  -----------------------------------------------------------------


        getConfigurationValue : function(name){
            return BDA.getStoredConfiguration()[name];
        },

         getStoredArray : function(name){
            var array = BDA.getConfigurationValue(name);
            if(array == null || array === undefined){
              array = [];
            }
            return array;
        },
        //  Sorts & uniq & store
        storeUniqueArray : function(name,array,doConcat){
          //also save the tags as "known tags"
          var storedArray ;
          if(doConcat){
            storedArray = BDA.getStoredArray(name);
            storedArray = storedArray.concat(array)
          }else{
            storedArray = array;
          }
      storedArray = BDA.unique(storedArray.sort());
          BDA.storeConfiguration(name,storedArray);
        },

        getStoredConfiguration : function(){
           if(!this.hasWebStorage)
            return {};
          var config;
          var configStr = localStorage.getItem(this.STORED_CONFIG);
          if (configStr !== null && configStr.length > 0)
            config = JSON.parse(configStr);
          else
            config = {};
          return config;
        },

        storeConfiguration : function (name, value)
        {
          if(this.hasWebStorage)
          {
            console.log("Try to store config: " + name + ", value : " + JSON.stringify(value));
            var storedConfig = this.getStoredConfiguration();
            storedConfig[name] = value;
            BDA.storeItem(this.STORED_CONFIG, JSON.stringify(storedConfig));
          }
        },

        // -- TAGS

        buildArray(stringIn){
          var cleaned = stringIn.replace(/[ \t]/g,'').replace(/,,+/g,',');
          var array;
          if(cleaned !=""){
            array=cleaned.split(',');
          }else{
            array=[];
          }
          return array;
        },

        buildTagsFromArray(tagNames,defaultValue){
           var value = defaultValue != null?defaultValue:false;
           var tags = {};
           for (var i = 0; i < tagNames.length; i++) {
            var tagName = tagNames[i];
            var tag = {};
            tag.selected=value;
            tag.name=tagName;
            tags[tagName] = tag;
          }
          console.log('buildTagsFromArray ' + JSON.stringify(tags));
          return tags;
        },

        buildTagsFromString(tagString,defaultValue){
            tagNames = BDA.unique(BDA.buildArray(tagString));
            return BDA.buildTagsFromArray(tagNames,defaultValue);
        },

        editTags(newTags){
          console.log('editTags + ' + JSON.stringify(newTags));
           var existingTags = BDA.getTags();
           for (var name in existingTags) {
            if(newTags[name] !=null){
              var oldTag = existingTags[name];
              newTags[name].selected=oldTag.selected;
            }
          }
          BDA.saveTags(newTags);
        },

        addTags(newTags){
          console.log('add tags:');
          var existingTags = BDA.getTags();
          console.log('existingTags = ' + JSON.stringify(existingTags));
          for (var name in newTags) {
            console.log('name : ' + name);
            var newTag = newTags[name];
            console.log('newTag = ' + JSON.stringify(newTag));
            if(existingTags[newTag.name] === null || existingTags[newTag.name] === undefined){
              existingTags[newTag.name] = newTag;
            } 
          }
          console.log('existingTags = ' + JSON.stringify(existingTags));
          BDA.saveTags(existingTags);
        },

          //tags
        getTags : function(){
            var tags = BDA.getConfigurationValue('tags');
            if(tags == null || tags == undefined){
              tags = {};
            }
            return tags;
        },
        saveTags : function(tags){
          BDA.storeConfiguration('tags',tags);
        },

        clearTags : function(){
            console.log('clearTags');
            var savedtags = BDA.getTags();
              for (var sTagName in savedtags) {
                 var sTag = savedtags[sTagName];
                 sTag.selected=false;
              }
              
            console.log('savedtags = ' + JSON.stringify(savedtags));
            BDA.saveTags(savedtags);
            BDA.reloadToolbar();
        },

        //--- Stored queries functions ------------------------------------------------------------------------

        getStoredRQLQueries : function ()
        {
          if(!this.hasWebStorage)
            return [];
          var rqlQueries;
          var rqlQueriesStr = localStorage.getItem('RQLQueries');
          if (rqlQueriesStr !== null && rqlQueriesStr.length > 0)
            rqlQueries = JSON.parse(rqlQueriesStr);
          else
            rqlQueries = [];
          return rqlQueries;
        },

        storeSplitValue : function ()
        {
          if(!this.hasWebStorage)
            return;
          var splitObj = {};
          splitObj.splitValue = $("#splitValue").val();
          splitObj.activeSplit = $("#noSplit").is(':checked');
          BDA.storeItem('splitObj', JSON.stringify(splitObj));
        },

        storeRQLQuery : function (name, query)
        {
          if(this.hasWebStorage)
          {
            console.log("Try to store : " + name + ", query : " + query);
            var storeQuery = {};
            storeQuery.name = name;
            storeQuery.query = query;
            storeQuery.repo = BDA.getComponentNameFromPath(BDA.getCurrentComponentPath());
            var rqlQueries = this.getStoredRQLQueries();
            rqlQueries.push(storeQuery);
            console.log(rqlQueries);
            BDA.storeItem('RQLQueries', JSON.stringify(rqlQueries));
          }
        },

        deleteRQLQuery : function (index)
        {
          var queries = this.getStoredRQLQueries();
          if (queries.length >  index)
          {
            queries.splice(index, 1);
            BDA.storeItem('RQLQueries', JSON.stringify(queries));
          }
        },
        purgeRQLQuery : function (rqlQueries)
        {
          // Purge query
          var purgedRqlQueries = [];
          for (var i = 0; i != rqlQueries.length; i++)
          {
            var query = rqlQueries[i];
            if (!query.hasOwnProperty("repo") || query.repo == BDA.getComponentNameFromPath(BDA.getCurrentComponentPath())) {
              purgedRqlQueries.push(rqlQueries[i]);
            }
          }
          return purgedRqlQueries;
        },

        reloadQueryList : function ()
        {
          $("#storedQueries").empty();
          this.showQueryList();
        },

        printStoredQuery : function (name)
        {
          console.log("printStoredQuery : " + name);
          var rqlQueries = this.getStoredRQLQueries();
          console.log(rqlQueries);
          if (rqlQueries)
          {
            for (var i = 0; i != rqlQueries.length; i++)
            {
              if (rqlQueries[i].name == name)
                this.setQueryEditorValue(rqlQueries[i].query + "\n");
            }
          }
        },
        //--- History functions ------------------------------------------------------------------------
        collectHistory : function ()
        {
          if (!this.hasWebStorage)
            return ;
          if (document.URL.indexOf("?") >= 0)
            return ;
          if (document.URL.indexOf("#") >= 0)
            return ;

          var componentPath = this.purgeSlashes(document.location.pathname);
          var componentHistory =  JSON.parse(localStorage.getItem('componentHistory')) || [];
          if ($.inArray(componentPath, componentHistory) == -1)
          {
            console.log("Collect : " + componentPath);
            componentHistory.unshift(componentPath);
            if (componentHistory.length >= 10)
              componentHistory = componentHistory.slice(0, 9);
            BDA.storeItem('componentHistory', JSON.stringify(componentHistory));
          }
        },

        showComponentHsitory : function ()
        {
          $("<div id='history'></div>").insertAfter(this.logoSelector);
          var componentHistory =  JSON.parse(localStorage.getItem('componentHistory')) || [];
          var html = "Component history : ";
          for (var i = 0; i != componentHistory.length; i++)
          {
            if (i !== 0)
              html += ", ";
            var comp = componentHistory[i];
            html += "<a href='" + comp + "'>" + this.getComponentNameFromPath(comp) + "</a>";
          }
          $("#history").html(html);
        },

        //MENU

    createMenu : function()
    {
      var $menuBar = $("<div id='menuBar'></div>").appendTo("body");
          this.createBugReportPanel($menuBar);
          this.createBackupPanel($menuBar);
          this.createConfigurationPanel($menuBar);
          this.createWhatsnewPanel($menuBar);
          this.createSearchBox($menuBar);

  
          $(".menu").bind("click",function() {
      {
        var $thisParent = $(this);
        var $panel;
        $('.menu').each(function()
        {
                $this = $(this);
                $panel = $('#'+$this.attr('data-panel')); 
                if($this.attr('id') != $thisParent.attr('id') && $panel.css('display') !="none"){
            {
                  $panel.slideToggle();
                  BDA.rotateArrow($this.find(".menuArrow i"));
                }
            });
           
            $panel = $('#'+$thisParent.attr('data-panel'));
            $panel.slideToggle();
            BDA.rotateArrow($thisParent.find(".menuArrow i"));
          });
        },

        //--- Search
        createSearchBox : function($menuBar){
           $searchBox = $("<div id='bdaSearch' class='menu' ></div>").appendTo($menuBar)
                          .html(
                             '<p>Search</p>'
                             +'<form action="/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml">'
                             +'<input type="text" name="query" id="searchFieldBDA" placeholder="focus: ctrl+shift+f"></input> '
                             +'</form>'
                           );




          $(document).keypress(function(e){

              var moz=(e.which == 70 && e.ctrlKey && e.shiftKey? 1 : 0);
              var chrome=(e.which == 6 && e.ctrlKey && e.shiftKey? 1 : 0);

              if (moz || chrome){
                $('#searchFieldBDA').focus();
              }
          });
        },

        //--- Config Panel

        createConfigurationPanel : function($menuBar){
    {
          $("<div id='bdaConfig' class='menu' data-panel='bdaConfigPanel'></div>").appendTo($menuBar)

          .html("<p>Configuration</p>"
              + "<div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>"
          );

      var $bdaConfigPanel = $("<div id='bdaConfigPanel' class='menuPanel'></div>").appendTo("body")



          .html("<p>I want to use the same BDA data on every domains : <input type='checkbox' id='" + BDA.GMValue_MonoInstance + "'>"
          );
          this.createDefaultMethodsConfig($bdaConfigPanel);

          $('#' + BDA.GMValue_MonoInstance).prop("checked", (GM_getValue(BDA.GMValue_MonoInstance) === true))
          .click(function(){
            var isMonoInstance = $(this).prop('checked');
            console.log("Setting storage mode to mono-instance : " + isMonoInstance);
            GM_setValue(BDA.GMValue_MonoInstance, isMonoInstance);
            if(isMonoInstance)
              GM_setValue(BDA.GMValue_Backup, JSON.stringify(BDA.getData()));
          });

          $("#bdaDataBackup").click(function (){
            var data = BDA.getData();
            BDA.copyToClipboard(JSON.stringify(data));
          });

          $("#bdaDataRestore").click(function (){
            if (window.confirm("Sure ?"))
            {
              var data = $("#bdaData").val().trim();
              BDA.restoreData(data, true);
            }
          });

        },
        //--- Bug report panel

        createBugReportPanel : function($menuBar)
        {
          var labels = ["Found a bug in BDA ?", "Want a new feature ?", "What's new in BDA ?"];
          var labelIndex = Math.floor((Math.random() * labels.length));

          $("<div id='bdaBug' class='menu' data-panel='bdaBugPanel'></div>").appendTo($menuBar)
          .html("<p>" + labels[labelIndex] + "</p>"
              + "<div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>"
          );

          $("<div id='bdaBugPanel' class='menuPanel'></div>").appendTo("body")
          .html("<p>How can I help and stay tuned ? "
          + "<br /><br /> Better Dyn Admin has a <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin'>GitHub page</a>. <br>"
              + "Please report any bug in the <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin/issues'>issues tracker</a>. Of course, you can also request new feature or suggest enhancement !"
              + "<br /><br /> Stay tuned, look at the <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin/milestones'>incoming milestones</a>."
              + "<br /><br /> <strong> BDA version " + GM_info.script.version + "</strong> </p>"
          );
        },
        
        //--- what's new functions --------------------------------------------------------------------------
        
        
        createWhatsnewPanel : function ()
        {
          $("<div id='whatsnew' class='menu' data-panel='whatsnewPanel'></div>").appendTo("body")
      .appendTo($menuBar)
          .html("<p>What's new</p>"
              + "<div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>"
          );
            
          $("<div id='whatsnewPanel'></div>").appendTo("body");
      .appendTo("body")
      .html("<p id='whatsnewContent'></p>");

          $.get("https://raw.githubusercontent.com/jc7447/BetterDynAdmin/master/WHATSNEW.md", function( data ) {
              $( "#whatsnewPanel" ).html( data );
        if ($("#whatsnewPanel").css("display") === "none")
              $( "#whatsnewContent" ).html(GM_getResourceText("whatsnew") );
          });
        },

        //--- backup panel functions ------------------------------------------------------------------------

        createBackupPanel : function ($menuBar)
        {
          $("<div id='bdaBackup' class='menu' data-panel='bdaBackupPanel'></div>").appendTo($menuBar)

          .html("<p>Backup</p>"
              + "<div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>"
          );

          $("<div id='bdaBackupPanel' class='menuPanel'></div>").appendTo("body")

          .html("<p>Why should I save Better Dyn Admin data ? "
              + "<br /><br /> Because BDA use javascript local storage. You will lose your favorite components and your stored queries if you clean your browser."
              + "<br /><br /><strong> Remember that you can also import your backup to a BDA in another domain !</strong> </p>"
              + "<textarea id='bdaData' placeholder='Paste your data here to restore it.'></textarea>"
              + "<button id='bdaDataBackup'>Backup</button>"
              + "<button id='bdaDataRestore'>Restore</button>"
          );

          $("#bdaDataBackup").click(function (){
            var data = BDA.getData();
            BDA.copyToClipboard(JSON.stringify(data));
          });

          $("#bdaDataRestore").click(function (){
            if (window.confirm("Sure ?"))
            {
              var data = $("#bdaData").val().trim();
              BDA.restoreData(data, true);
            }
          });
        },

        getData : function()
        {
          console.log("Getting all data from localstorage");
          var dataObj = {};
          dataObj.components = BDA.getStoredComponents();
          dataObj.queries = BDA.getStoredRQLQueries();
          dataObj.configuration = BDA.getStoredConfiguration();
          return dataObj;
        },

        reloadData : function()
        {
          this.reloadToolbar();
          if (this.isRepositoryPage)
            this.reloadQueryList();
        },

        restoreData : function (data, reloadUI)
        {
          if(this.hasWebStorage && data !== undefined)
          {
            try
            {
              var dataObj = JSON.parse(data);
              BDA.storeItem('Components', JSON.stringify(dataObj.components));
              BDA.storeItem('RQLQueries', JSON.stringify(dataObj.queries));
              BDA.storeItem(this.STORED_CONFIG, JSON.stringify(dataObj.configuration));
              if (reloadUI)
                this.reloadData();
            }
            catch (e) {
              console.error("Parsing error:", e);
            }
          }
        },

        copyToClipboard : function (text)
        {
          GM_setClipboard(text);
          window.alert("Data have been added to your clipboard");
        },

            // advanced config


        createDefaultMethodsConfig : function(parentPanel)
        {


          $config = $('<div id="advancedConfig"></div>');
          $config.appendTo(parentPanel);
          // Default methods
          var savedMethods = this.getConfigurationValue('default_methods');
          if(savedMethods === undefined || savedMethods == null){
            savedMethods = "";
          }

           $config.append(
            "<p>Default methods when bookmarking components:</p>"
            + "<textarea id='config-methods-data' class='' placeholder='List of methods names, comma separated'>"+savedMethods+"</textarea>"
            );

           $submitMethods = $('<button id="config-methods-submit">Save</button>')
            .bind('click',function(){
                var methods=$('#config-methods-data').val().trim();
                var methodsArray=methods.replace(/ /g,'').split(",");
                console.log('storing methods : ' + methodsArray);
                BDA.storeConfiguration("default_methods",methodsArray);
              }
           )
           ;
           $config.append($submitMethods);
           
          // Default properties

          var savedProperties = this.getConfigurationValue('default_properties');
          if(savedProperties === undefined || savedProperties == null){
            savedProperties = "";
          }

          $config.append(
            "<p>Default properties when bookmarking components:</p>"
            + "<textarea id='config-properties-data' class='' placeholder='List of properties, comma separated'>"+savedProperties+"</textarea>"
            );

          $submitProperties  = $('<button id="config-properties-submit">Save</button>')
            .bind('click', function(){
                var properties=$('#config-properties-data').val().trim();
                var propertiesArray=properties.replace(/ /g,'').split(",");
                console.log('storing properties : ' + propertiesArray);
                BDA.storeConfiguration("default_properties",propertiesArray)
              }
            );
          $config.append($submitProperties);

          var savedTags = this.getTags();
          var tagAsString = "";
          var index=0;
          var tagsSize = Object.keys(savedTags).length;
          for (var key in savedTags) {
            tagAsString+=key;
            if(index < tagsSize){
              tagAsString+=','
            }
            index++;
          }
           $config.append(
            "<p>Edit tags:</p>"
            + "<textarea id='config-tags-data' class='' placeholder='List of tags, comma separated'>"+tagAsString+"</textarea>"
            );

           $submitTags  = $('<button id="config-tags-submit">Save</button>')
            .bind('click', function(){
                var tagString=$('#config-tags-data').val();
                var tags = BDA.buildTagsFromString(tagString,false);
                console.log('storing tags : ' + JSON.stringify(tags));
                BDA.editTags(tags);
                BDA.reloadToolbar();
              }
            );
          $config.append($submitTags);

        },

        //--- Toolbar functions ------------------------------------------------------------------------

        getStoredComponents : function ()
        {
          if(!this.hasWebStorage)
            return [];
          var storedComp;
          var storedCompStr = localStorage.getItem('Components');
          if (storedCompStr)
            storedComp = JSON.parse(storedCompStr);
          else
            storedComp = [];

          if(storedComp.length > 0 && this.idsSet(storedComp))
            storedComp = this.generateCompIds(storedComp);
          return storedComp;
        },

        idsSet : function(storedComponents)
        {
          for(var i = 0; i != storedComponents.length; i++)
          {
            if (storedComponents[i].hasOwnProperty("id"))
              return false;
          }
          return true;
        },

        generateCompIds : function(storedComponents)
        {
          var curId = 0;
          for(var i = 0; i != storedComponents.length; i++)
          {
            storedComponents[i].id = curId;
            curId++;
          }
          BDA.storeItem('Components', JSON.stringify(storedComponents));
          return storedComponents;
        },

    getComponent : function(name){
      console.log("get component : " + name);
      var components = this.getStoredComponents();
      for(var i = 0; i != components.length; i++)
      {
        if (components[i].componentName == name)
        {
          return components[i];
        }
      }
    },

        deleteComponent : function (componentToDelete)
        {
          console.log("Delete component : " + componentToDelete);
          var components = this.getStoredComponents();
          for(var i = 0; i != components.length; i++)
          {
            if (components[i].componentName == componentToDelete)
            {
              components.splice(i , 1);
              break;
            }
          }
          console.log(components);
          BDA.storeItem('Components', JSON.stringify(components));
          this.reloadToolbar();
        },

        storeComponent : function (component, methods, vars,tags)
        {
          if(this.hasWebStorage)
          {
            console.log("Try to store : " + component);
            var compObj = {};
            compObj.componentPath = component;
            compObj.componentName = this.getComponentNameFromPath(component);
            compObj.colors = this.stringToColour(compObj.componentName);
            var storedComp = this.getStoredComponents();
            if (storedComp.length > 0)
              compObj.id = storedComp[storedComp.length - 1].id + 1;
            console.log("id : " + compObj.id);

            compObj.methods = methods;
            compObj.vars = vars;
            compObj.tags =tags;
            storedComp.push(compObj);

            BDA.storeItem('Components', JSON.stringify(storedComp));
            var tagMap = BDA.buildTagsFromArray(tags,false);
            BDA.addTags(tagMap);

          }
        },

    replaceComponent : function (componentName, methods, vars,tags)
    {
      if(this.hasWebStorage)
      {
        console.log("Try to edit : " + componentName);
        var components = this.getStoredComponents();
        for(var i = 0; i != components.length; i++)
        {
          if (components[i].componentName == componentName)
          {
            var compObj = components[i];
            compObj.methods = methods;
            compObj.vars = vars;
            compObj.tags =tags;
          }
        }

        BDA.storeItem('Components', JSON.stringify(components));
        var tagMap = BDA.buildTagsFromArray(tags,false);
        BDA.addTags(tagMap);

      }
    },

        storeItem : function(itemName, itemValue)
        {
          //console.log("Storing item : " + itemName + " : " + itemValue);
          localStorage.setItem(itemName, itemValue);
          if(GM_getValue(BDA.GMValue_MonoInstance) === true)
            GM_setValue(BDA.GMValue_Backup, JSON.stringify(BDA.getData()));
        },

        getComponentNameFromPath : function (componentPath)
        {
          // Strip last slash if any
          if (componentPath[componentPath.length - 1] == "/")
            componentPath = componentPath.substr(0 , componentPath.length - 1);

          var tab = componentPath.split("/");
          //console.log("For component :" + componentPath + ", name is : " + (tab[tab.length - 1]));
          return tab[tab.length - 1];
        },

        purgeSlashes : function(str)
        {
          return str.replace(/([^:]\/)\/+/g, "$1");
        },

        getComponentShortName : function (componentName)
        {
          var shortName = "";
          for(var i = 0; i != componentName.length; i++)
          {
            var character = componentName[i];
            if (character == character.toUpperCase() && character != ".")
              shortName += character;
          }
          // TODO : return 3 first letter if shortName is empty
          return shortName;
        },

        getCurrentComponentPath : function()
        {
          return this.purgeSlashes(document.location.pathname.replace("/dyn/admin/nucleus", ""));
        },

        getBorderColor : function (colors)
        {
          var borderColor = [];
          for (var i = 0; i != colors.length; i++)
          {
            var colorValue = colors[i] - 50;
            if (colorValue < 0)
              colorValue = 0;
            borderColor.push(colorValue);
          }
          return this.colorToCss(borderColor);
        },

        colorToCss : function (colors)
        {
          var cssVal =  "rgb(" ;
          for (var i = 0; i < colors.length; i++)
          {
            if (i !== 0)
              cssVal += ",";
            cssVal += colors[i];
          }
          cssVal += ")";
          return cssVal;
        },

        verifyColor : function (colors)
        {
          for (var i = 0; i < colors.length; i++)
            if (colors[i] > 210)
              colors[i] = 210;
          return colors;
        },

        stringToColour : function (str)
        {
          var colors = [];
          var hash = 0;
          for (var i = 0; i < str.length; i++)
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
          for (i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF;
            var hexVal = ('00' + value.toString(16)).substr(-2);
            colors.push(parseInt(hexVal, 16));
          }
          return this.verifyColor(colors);
        },

        showMoreInfos : function (component)
        {
          console.log("Show more info " + component);
          $("#favMoreInfo" + component).toggle();
        },

        deleteToolbar : function ()
        {
          $("#toolbar").remove();
          $("#toolbarHeader").remove();
          $('#toolbarContainer').remove();
          $('#addComponentToolbarPopup').remove();
        },

        reloadToolbar: function ()
        {
          this.deleteToolbar();
          this.createToolbar();
        },

        isComponentAlreadyStored : function(componentPath)
        {
          var components = this.getStoredComponents();
          for (var i = 0; i < components.length; i++) {
            if (components[i].componentPath == componentPath)
              return true;
          }
          return false;
        },

        createToolbar :function ()
        {
          console.log("createToolbar");
          //get existing tags


          $("<div id='addComponentToolbarPopup' class='popup_block' data-mode='' data-component='' data-component-path=''>"
                + "<div class='addFavOptions'>"
                  + "<a href='#' class='close'><i class='fa fa-times'></i></a>"
              + "<h3 class='popup_title' id='favPopinTitle-add'>Add new component</h3>"
              + "<h3 class='popup_title' id='favPopinTitle-edit'>Edit component <span id='favPopinName'></span></h3>"
                  + "<p>Choose methods and/or properties to shortcut : </p>"
                  + "<div id='addComponentToolbarPopupContent'>"
                    + "<div id='methods'><ul></ul></div>"
                    + "<div id='vars'><ul></ul></div>"
                  + "</div><br>"
                  + "<div id='favSetTags'>"
                    + "<div class='favline'>"
                      + "<div>Add tags:</div>"
                      + "<div><ul id='existingTags'></ul></div>"
                    + "</div>"
                    + "<div class='favline'>"
                    + "<div>New tags:</div>"
                     + "<div><input id='newtags' class='newtags' type='text' placeholder='comma separated'></input></div>"
                   + "</div>"
                  + "</div>"
                  + "<div class='addFavSubmit'>"
                + "<button type='button' id='submitComponent' class='fav-submit-button fav-add'>Add <i class='fa fa-play fa-x'/></button>"
                + "<button type='button' id='submitEditComponent' class='fav-submit-button fav-edit'>Save <i class='fa fa-play fa-x'/></button>" 
                  + "</div>"
                + "</div>"
              + "</div>").insertAfter(this.logoSelector);

          BDA.addExistingTagsToToolbarPopup();


          var favs = this.getStoredComponents();

          $("<div id='toolbarContainer'></div>").insertAfter(this.logoSelector);
          $("<div id='toolbar'></div>").appendTo("#toolbarContainer");

          var tags = BDA.getTags();
          var selectedTags = [];
          for(var tagName in tags){
            var tag = tags[tagName];
            if(tag.selected){
              selectedTags.push(tagName);
            }
          }

          for(var i = 0; i != favs.length; i++){
            var fav = favs[i];
            var show = false; 

            var componentTags = fav.tags;
            if(selectedTags !=null && selectedTags.length > 0){
              //check if any tag is selected
              this.logTrace(fav.componentName + ' = ' + componentTags);
              if(componentTags !== null && componentTags !== undefined){
                for (var j = 0; j < componentTags.length; j++) {
                  var cTag = componentTags[j];
                  if($.inArray(cTag,selectedTags) > -1){
                    show = true;
                  }
                }
              }
            }else{
              show = true;
            }
            //check filters

            if(show){
              var colors = this.stringToColour(fav.componentName);
              var shortName = this.getComponentShortName(fav.componentName);
              var callableHTML = "<div class='favMethods'>";
              if(fav.methods !== undefined)
                fav.methods.forEach(function(element){
                  callableHTML += "<a target='_blank' href='" + fav.componentPath + "?shouldInvokeMethod=" + element + "'>Call " + element + "</a><br>";
                });
              callableHTML += "</div><div class='favVars'>";
              if(fav.vars !== undefined)
                fav.vars.forEach(function(element){
                  callableHTML += "<a target='_blank' href='" + fav.componentPath + "?propertyName=" + element + "'>Change " + element + "</a><br>";
                });
              callableHTML += "</div>";

              var favTags = '';
               
              if(componentTags !== null && componentTags !== undefined){
                for (var k = 0; k < componentTags.length; k++) {
                  var t = componentTags[k];
                  favTags+='#'+t;
                  if(k+1 < componentTags.length){
                    favTags+=',';
                  }
                }
              }

              $("<div id='fav-"+fav.componentName+"' data-component='"+fav.componentName+"' data-component-path='"+fav.componentPath+"'></div>")
                  .addClass('toolbar-elem fav')
                  .css("background-color", this.colorToCss(colors))
                  .css("border", "1px solid " + this.getBorderColor(colors))
                  .html("<div class='favLink'>"
                    + "<a href='" + fav.componentPath + "' title='" + fav.componentName + "' >"
                    + "<div class='favTitle'>" +  shortName + "</div>"
                    + "<div class='favName'>" + fav.componentName + "</div>"
                    +"</a></div>"
                    + "<div class='favArrow' id='favArrow" + fav.id + "'><i class=' up fa fa-arrow-down'></i></div>"
                    + "<div class='favMoreInfo' id='favMoreInfo" + fav.id + "'>"
                    + "<div class='favLogDebug'>"
                    + " <form method='POST' action='" + fav.componentPath + "' id='logDebugForm" + fav.componentName + "'>"
                    + "<input type='hidden' value='loggingDebug' name='propertyName'>"
                    + "<input type='hidden' value='' name='newValue'>"
                    + "logDebug : "
                    + "<a href='javascript:void(0)' class='logdebug' id ='logDebug" + fav.componentName + "'>true</a>"
                    + "&nbsp; | &nbsp;"
                    + "<a href='javascript:void(0)' class='logdebug' id ='logDebug" + fav.componentName + "'>false</a>"
                    +"</div>"
                    + callableHTML
                    + "<div class='favline'>"
                    + "<div class='favDelete fav-button' id='delete" + fav.componentName + "'><i class='fa fa-trash-o'></i> Delete</div>"
                    + "<div class='favEdit fav-button' id='edit" + fav.componentName + "' data-component='"+ fav.componentName  +"'><i class='fa fa-pencil-square-o'></i> Edit</div>" 
                    + "</div>"
                    + '<div class="fav-tags">'+ favTags + '</div>'
                    + "</div>")
                  .appendTo("#toolbar");
                }
            }


            $(".favArrow").click(function() {
              console.log("Click on arrow");
              var id = this.id;
              var idToExpand = "#" + id.replace("favArrow", "favMoreInfo");
              $(idToExpand).slideToggle();
              BDA.rotateArrow($("#" + id + " i"));

            });

            $(".favDelete").click(function() {
              console.log("Click on delete");
              var componentToDelete = this.id.replace("delete", "");
              BDA.deleteComponent(componentToDelete);
            });

            $(".favEdit").click(function() {
              var editName = $(this).attr('data-component');
              console.log("Click on edit " + editName);
              var $curFav = $('#fav-'+editName);
              var savedComp = BDA.getComponent(editName);

              $.ajax({
                type: "POST",
                url: savedComp.componentPath,
                success: function(result, status, jqXHR) {
                    BDA.openFavPopin('edit',savedComp,$('<div></div>').html(result));//hackish...
                  }
              });

            });      

            $(".logdebug").click(function() {
              console.log("Click on logdebug");
              var componentName = this.id.replace("logDebug", "");
              var logDebugState = this.innerHTML;
              console.log("component : " + componentName + ", logDebugState : " + logDebugState);
              $("#logDebugForm" + componentName + " input[name=newValue]").val(logDebugState);
              $("#logDebugForm" + componentName).submit();
            });

            $('#submitEditComponent').click(function(){

                $this = $(this);
                $popin = $('#addComponentToolbarPopup');

                BDA.logTrace('submit component');
                $('.popup_block').fadeOut();
                var methods = [];
                var vars = [];
                $('.method:checked').each(function(index, element){
                    methods.push(element.parentElement.textContent);
                });
                $('.variable:checked').each(function(index, element){
                    vars.push(element.parentElement.textContent);
                });
                // filter out empty values
                var tags = BDA.buildArray($('#newtags').val());
                //add selected tags
                $('#existingTags input:checkbox:checked').each(function(index, element){
                    tags.push(element.parentElement.textContent);
                });
                //remove dupes
                tags=BDA.unique(tags.sort());

                console.log("methods : " + methods);
                console.log("vars : " + vars);
                console.log("tags : " + tags);

                var editComponentName = $popin.attr('data-component');
                BDA.replaceComponent(editComponentName, methods, vars,tags);
                BDA.reloadToolbar();
            });

      if (this.isComponentPage)
      {
        var componentPath = this.getCurrentComponentPath();
        if (!this.isComponentAlreadyStored(componentPath))
        {
          console.log('adding fav button');
          $("<div class='toolbar-elem newFav'><a href='javascript:void(0)' id='addComponent' title='Add component to toolbar'>+</a></div>")
          .appendTo("#toolbar");

          $(".newFav").click(function() {
            BDA.openFavPopin('add');
          });
        }
      }
 			BDA.addFavTagList();
	  },

    openFavPopin : function(mode, savedComp, $compPage){
      console.log("Add component : " + mode);
      var methodsList = $("#methods");
      var varsList = $("#vars");
      var tagList = $("#tags");
      methodsList.empty();
      varsList.empty();

      var tableMethods, tablevars, defMethods, defProperties, defTags, componentName, componentPath;
      
      if(mode == 'edit' && savedComp != null && $compPage){
        tableMethods = $compPage.find('h1:contains("Methods")').next();
        tablevars = $compPage.find('h1:contains("Properties")').next();
        defMethods = savedComp.methods;
        defProperties = savedComp.vars;
        defTags = savedComp.tags;
        componentName = savedComp.componentName;
        componentPath = savedComp.componentPath;
      } else { //add mode
        tableMethods = $('h1:contains("Methods")').next();
        tablevars = $('h1:contains("Properties")').next();
        defMethods = BDA.getConfigurationValue('default_methods');
        defProperties = BDA.getConfigurationValue('default_properties');
        defTags = [];
        componentName = "";
        componentPath = "";
      }

      BDA.logTrace('defMethods : ' + defMethods);
      BDA.logTrace('defProperties : ' + defProperties);
      BDA.logTrace('defTags : ' + defTags);

      tableMethods.find('tr').each(function(index, element){
        if(index > 0)
        {
           var linkMethod = $(element).find('a').first();
           var methodName = $(linkMethod).attr("href").split('=')[1];
           methodsList.append('<li><input type="checkbox" class="method" id="method_' + methodName + '"><label for="method_' + methodName + '">' + methodName + '</label></li>');
        }
      });
      //handle default methods
      if(defMethods != null){
          defMethods.forEach(function(methodName){
          console.log('setting default method: ' + methodName);
          $('#method_'+methodName).attr('checked',true);
        });
      }

      tablevars.find('tr').each(function(index, element){
        if(index > 0)
        {
          var linkVariable =  $(element).find('a').first();
          var variableName = $(linkVariable).attr("href").split('=')[1];
          varsList.append('<li><input type="checkbox" class="variable" id="var_' + variableName + '"><label for="var_' + variableName + '">' + variableName + '</label></li>');
        }
      });

      if(defProperties != null){
        defProperties.forEach(function(name){
          console.log('setting default properties: ' + name);
          $('#var_'+name).attr('checked',true);
        });
      }

      if(defTags != null){
        defTags.forEach(function(name){
          console.log('setting default tags: ' + name);
          $('#tag_'+name).attr('checked',true);
        });
      }

      //show edit/add title
      $('.popup_title').css('display','none');
      $('#favPopinTitle-'+mode).css('display','block');

      $('.fav-submit-button').css('display','none');
      $('.fav-'+mode).css('display','block');

      if(mode == 'edit'){
        $('#favPopinName').html(savedComp.componentName);
          }

      $('#addComponentToolbarPopup')
        .attr('data-mode',mode)
        .attr('data-component',componentName)
        .attr('data-component-path',componentPath)
        .fadeIn();

    },

    addExistingTagsToToolbarPopup : function(){
      //add tags to the addFav popup
      var tags = this.getTags();
      $tagList = $('#existingTags');

          var sortedTags=[];
          for (var tagName in tags) {
            sortedTags.push(tagName);
          }
          sortedTags = BDA.sort(sortedTags);

          for (var i = 0; i < sortedTags.length; i++) {
            var tagValue = sortedTags[i]
            $('<label>'+tagValue+'</label>')
            .attr('for','tagSelector_'+tagValue)
            .insertAfter(
            $('<input/>',{
                id:'tagSelector_'+tagValue,
              type:'checkbox',
              name:tagValue
            })
           .appendTo(
             $('<li></li>').appendTo($tagList)
           )
          );
        }
    },

    addFavFilter : function(){

          var tags = this.getTags();
          if(tags !=null && Object.keys(tags).length> 0){

            $("<div class='toolbar-elem favFilter'><a href='javascript:void(0)' id='favFilter' title='Filter'><i class='fa fa-chevron-down fav-chevron'></i></a></div>")
                .on('click',function () {
                    var open = BDA.getConfigurationValue('filterOpen');
                    if(open == null || open == undefined || !open){
                      open = false;
                    }
                    BDA.storeConfiguration('filterOpen',!open);

                $('#favTagList').toggle(100);
                })
                .appendTo("#toolbar");
          }
           
        },

        addFavTagList : function(){
          console.log('addfavTagList');
          var tags = this.getTags();

          $favline = $('<div id="favTagList" class="favline">').appendTo('#toolbar');

          var $list = $('<ul></ul>');

          //if at least one filter
          if(tags !=null && Object.keys(tags).length> 0){
            $('<button id="clear-filters" class="bda-button bda-button-icon" title="Clear"><i class="fa fa-times" aria-hidden="true"></i></button>')
             .on('click',this.clearTags)
             .appendTo(
                $('<li class="tag-filter" ></li>')
               .appendTo($list)
             );
          }

          var sortedTags=[];
          for (var tagName in tags) {
            sortedTags.push(tagName);
          }
          sortedTags=BDA.sort(sortedTags);

          for (var i = 0; i < sortedTags.length; i++) {
            var tagName = sortedTags[i]
            var tag = tags[tagName];
            var tagColor = this.stringToColour(tagName);

            $('<label >#'+tagName+'</label>')
            .attr('for','favFilter_'+tagName)            
            .insertAfter(
              $('<input/>',{
                id:'favFilter_'+tagName,
                type:'checkbox',
                name:tagName,
            id:'favFilter'+tagName,
                class:'favFilterTag',
                checked: tag.selected
              }
             )
             .on('change',function(){
                var name = $(this).attr('name');
                console.log('applyFavFilter : '+ name);
                var tags = BDA.getTags();
                var tag = tags[name];
                if(tag !=null){
                  tag.selected=$(this).prop('checked');
                }
                BDA.saveTags(tags);
                BDA.reloadToolbar();
             })
             .appendTo(
               $('<li class="bda-button tag-filter" ></li>')
               .css("background-color", this.colorToCss(tagColor))
               .css("border", "1px solid " + this.getBorderColor(tagColor))
               .appendTo($list)
             )
            );

          }
          $list.appendTo($favline);

      $elems = $list.children('li');
          
      $elems.sort(function(a,b){
        var an = $(a).find('label').html();
        var bn = $(b).find('label').html();

        if(an > bn) {
          return 1;
        }
        if(an < bn) {
          return -1;
        }
        return 0;
      });

      $elems.detach().appendTo($list);  
      

          /*var open = BDA.getConfigurationValue('filterOpen');
          if(open == null || open == undefined || !open){
            $tagList.css('display','none');
          }*/

        },

        applyFavFilter :function(tagName){
          //save tags

        },

        createActorCaller : function()
        {
                var componentPathName = this.getCurrentComponentPath();
                var tableActor = $('table:first');
                var tableActorHeaderRow = tableActor.find('tr:first');
                var tableActorHeaderColumns = tableActorHeaderRow.find('th');
                var tableActorHeaderColumnsCount = tableActorHeaderColumns.size();
                var tableActorDataRow = tableActor.find('tr:eq(1)');
                var tableActorDataRowCells = tableActorDataRow.find('td');
                var actorChainIdValue = $("h2:contains('Actor Chain:')").text().replace("Actor Chain: ", "");

                var inputsHeader = tableActorHeaderColumns.filter(function(index, element){
                  return $(element).text() === "Inputs";
                });
                var inputsIndex = $(inputsHeader).index();
                var tableInputs = $(tableActorDataRow.children().get(inputsIndex)).children().get(0);
                var inputs = [];
                if(tableInputs !== undefined)
                {
                    var inputRows = $(tableInputs).find('tr');
                    var inputsSize = inputRows.size();
                    for(var i = 1; i < inputsSize; i++)
                    {
                        var inputRow = $(inputRows.get(i));
                        var name = $(inputRow.children().get(0));
                        var value = $(inputRow.children().get(1));
                        var isNucleus = value.text().indexOf("nucleus") != -1;
                        if(!isNucleus)
                        {
                            inputs.push(name.text());
                        }
                    }
                }
                var inputsHTML = "";
                for(var input in inputs)
                {
                    inputsHTML += inputs[input] + " <textarea name='" + inputs[input] + "'></textarea><br />";
                }
                var url = window.location.origin + '/rest/model' + componentPathName + actorChainIdValue;
                console.log(url);
                var actorChainCallHtml = "<div id='actorChainCall' border>"
                    + "<h2>Call actor</h2>"
                    + "<a href='javascript:void(0)' id='copyChainUrl'>Copy URL to clipboard</a>";
                    if (inputs.length > 0)
                      actorChainCallHtml += "<br />Post parameters are " + inputs + "<br />";
                    actorChainCallHtml += "<form method='POST' action='/rest/model" + componentPathName + actorChainIdValue + "'>"
                    + inputsHTML
                    + "<button type='submit'>Call <i class='fa fa-play fa-x'></button>"
                    + "</form></div>";

                tableActor.after(actorChainCallHtml);
                $("#copyChainUrl").click(function(){
                  BDA.copyToClipboard(url);
                });
        },

        setupPerfMonitorPage : function()
        {
          this.setupSortingTabPerfMonitor($("table:eq(1)"));
        },

        setupPerfMonitorTimePage : function()
        {
          this.setupSortingTabPerfMonitor($("table:eq(0)"));
        },

        setupSortingTabPerfMonitor : function($tabSelector)
        {
          $tabSelector.addClass("tablesorter")
          .removeAttr("border")
          .removeAttr("cellpadding");
          $tabSelector.prepend("<thead class='thead' />");
          // Put first tr into a thead tag
          $tabSelector.find("tr:eq(0)").appendTo(".thead");
          // Replace td by th
          $('.thead td').each(function() {
            var $this = $(this);
            $this.replaceWith('<th class="' + this.className + '">' + $this.text() + '</th>');
          });
          $tabSelector.tablesorter({
                                    'theme' : 'blue',
                                    'widgets' : ["zebra"],
                                    'widgetOptions' : {
                                      zebra : [ "normal-row", "alt-row" ]
                                    }
          });
        },

        setupExecuteQueryPage : function()
        {
          $("<div  id='switchDataSource'/>")
          .append("<p>Query will be execute in data source : <span id='curDataSourceName' > " + this.getCurrentDataSource() + " </span></p>")
          .append("<p>Switch data source to : <select id='newDataSource'>" + this.getAvailableDataSource() + "</select><button id='switchDataSourceBtn'>Enter <i class='fa fa-play fa-x'></i></button></p>")
          .insertAfter($("h1:contains('Execute Query')"));
          $("textarea").prop("id", "sqltext");
          if ($("table").size() > 0)
            $("table").prop("id", "sqlResult");

          $("#switchDataSourceBtn").click(function(){
            var selectedDataSource = $("#newDataSource").val();
            $.ajax({
              type: "POST",
              url : "/dyn/admin/nucleus" + BDA.connectionPoolPointerComp,
              data : {"newValue" : BDA.dataSourceDir + selectedDataSource, "propertyName" : "connectionPool"},
              async : false
            });
            window.location.reload();
          });
        },

        getAvailableDataSource : function()
        {
          var datasources = [];
          var url = "/dyn/admin/nucleus" + this.dataSourceDir;
          $.ajax({
            url : url,
            success : function(data) {
              $(data)
              .find("h3 a")
              .each(function(index, value) {
                var strValue = $(value).text();
                if (strValue !== null && strValue != "DataSourceInfoCache" && strValue.indexOf("DataSource") != -1)
                  datasources += "<option>" + strValue + "</option>";
              });
            },
            async : false
          });
          return datasources;
        },

        getCurrentDataSource : function()
        {
          var datasource;
          var url = "/dyn/admin/nucleus" + this.connectionPoolPointerComp;
          $.ajax({
             "url" : url,
             "success" : function(data) {
              datasource = $(data)
              .find("a:contains('connectionPoolName')")
              .parent()
              .next()
              .find("span")
              .text();
              console.log(datasource);
            },
            "async" : false
          });
          return datasource;
        },

        //--- Item Tree functions ------------------------------------------------------------------------

        setupItemTreeForm : function()
        {
          $("<div id='itemTree' />").insertAfter("#RQLEditor");
          var $itemTree = $("#itemTree");
          $itemTree.append("<h2>Get Item Tree</h2>");
          $itemTree.append("<p>This tool will recursively retrieve items and print the result with the chosen output."
            +  "<br> For example, if you give an order ID in the form below, you will get all shipping groups, payment groups, commerceItems, priceInfo... of the given order"
            +  "<br><b> Be careful when using this tool on a live instance ! Set a low max items value.</b></p>");

          $itemTree.append("<div id='itemTreeForm'>"
              +"id : <input type='text' id='itemTreeId' /> &nbsp;"
            +  "descriptor :  <span id='itemTreeDescriptorField' ><select id='itemTreeDesc' class='itemDescriptor' >" + this.getDescriptorOptions() + "</select></span>"
            +  "max items : <input type='text' id='itemTreeMax' value='50' /> &nbsp;<br><br>"
            +  "output format :  <select id='itemTreeOutput'>"
            +  "<option value='HTMLtab'>HTML tab</option>"
            +  "<option value='addItem'>add-item XML</option>"
            +  "<option value='removeItem'>remove-item XML</option>"
            +  "<option value='printItem'>print-item XML</option>"
            +  "</select>&nbsp;"
            +  "<input type='checkbox' id='printRepositoryAttr' /><label for='printRepositoryAttr'>Print attribute : </label>"
            +  "<pre style='margin:0; display:inline;'>repository='"+ this.getCurrentComponentPath() + "'</pre> <br><br>"
            +  "<button id='itemTreeBtn'>Enter <i class='fa fa-play fa-x'></i></button>"
            + "</div>");
          $itemTree.append("<div id='itemTreeInfo' />");
          $itemTree.append("<div id='itemTreeResult' />");
          $("#itemTreeBtn").click(function() {
            var descriptor = $("#itemTreeDesc").val();
            var id = $("#itemTreeId").val().trim();
            var maxItem = parseInt($("#itemTreeMax").val());
            var outputType = $("#itemTreeOutput").val();
            var printRepoAttr = $("#printRepositoryAttr").is(':checked');
            console.log("max item : " + maxItem);
            BDA.getItemTree(id, descriptor, maxItem, outputType, printRepoAttr);
          });

        },

    storeXmlDef : function(componentPath, rawXML)
    {
      console.log("Storing XML def : " + componentPath);
      var timestamp =  Math.floor(Date.now() / 1000);

      localStorage.setItem("XMLDefMetaData", JSON.stringify({componentPath : componentPath, timestamp: timestamp}));
      localStorage.setItem("XMLDefData", rawXML);
    },

    getXmlDef : function(componentPath)
    {
      console.log("Getting XML def for : " + componentPath);
      var timestamp =  Math.floor(Date.now() / 1000);
      var xmlDefMetaData = JSON.parse(localStorage.getItem("XMLDefMetaData"));
      if (!xmlDefMetaData)
        return null;
      if (xmlDefMetaData.componentPath != componentPath || (xmlDefMetaData.timestamp + BDA.xmlDefinitionCacheTimeout) < timestamp)
      {
        console.log("Xml def is outdated or from a different repo");
        return null;
      }
      return localStorage.getItem("XMLDefData");
    },

        processRepositoryXmlDef : function(property, callback)
        {
      if(callback !== undefined)
      {
        // First check cache value if any
        var rawXmlDef = BDA.getXmlDef(BDA.getCurrentComponentPath());
        if (rawXmlDef !== null)
        {
          console.log("Getting XML def from cache");
          var xmlDoc = jQuery.parseXML(rawXmlDef);
          if(callback !== undefined)
              callback($(xmlDoc));
        }
        // If no cache entry, fetch the XML def in ajax
        else
         {
          var url = location.protocol + '//' + location.host + location.pathname + "?propertyName=" + property;
          console.log(url);
          jQuery.ajax({
            url:     url,
            success: function(result) {
              $result = $(result);
              if ($result.find("pre").size() > 0)
              {
                rawXmlDef = $result.find("pre")
                .html()
                .trim()
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace("&nbsp;", "")
                .replace("<!DOCTYPE gsa-template SYSTEM \"dynamosystemresource:/atg/dtds/gsa/gsa_1.0.dtd\">", "");
                  try
                  {
                      console.log("XML def length : " + rawXmlDef.length);
                      var xmlDoc = jQuery.parseXML(rawXmlDef);
                      BDA.storeXmlDef(BDA.getCurrentComponentPath(), rawXmlDef);
                      callback($(xmlDoc));
                  }
                  catch(err)
                  {
                      console.log("Unable to parse XML def file !");
                      callback(null);
                      console.log(err);
                  }
              }
              else
                callback(null);
            },
          });
        }
      }
        },

        getSubItems : function(items, $xmlDef, maxItem, outputType, printRepoAttr)
        {
          var nbItem =  BDA.itemTree.size;
          console.log("maxItem : " + maxItem + ", nbItem : " + nbItem);

      // Ensure that getSubItems is not call more than maxItem times
          if(nbItem >= maxItem)
          {
         console.log("max Item ("+maxItem+") reached, stopping recursion");
         return;
          }

      var xmlText = "";
      for(var batchSize = 0; batchSize != items.length; batchSize++)
      {
        // Don"t ask for more items than limit
        if ((BDA.nbItemReceived + batchSize) >= maxItem)
          break;
        xmlText += "<print-item id='" + items[batchSize].id + "' item-descriptor='" + items[batchSize].desc + "' />\n";
      }
      console.log(xmlText);
      console.log("batch size : " + batchSize);
      // Only request if the batchSize contains something
      if (batchSize > 0)
      {
        $.ajax({
          type: "POST",
          url: document.URL,
          data: { xmltext: xmlText},
          success: function(result, status, jqXHR) {
              //console.log(this.nbItemToCall);
            //BDA.nbItemReceived += this.nbItemToCall;
            var rawItemsXml = $(result).find("code").html();
            // remove first 2 lines
            var tab = rawItemsXml.split("\n");
            tab.splice(0,2);
            rawItemsXml = tab.join("\n").trim();
            // unescape HTML
            rawItemsXml = "<xml>" + rawItemsXml.replace(/&lt;/g, "<").replace(/&gt;/g, ">") + "</xml>";

            var xmlDoc = jQuery.parseXML(rawItemsXml);
            BDA.nbItemReceived += $(xmlDoc).find("add-item").size();
            $("#itemTreeInfo").html("<p>" + BDA.nbItemReceived + " items retrieved</p>");

            var subItems = [];
            $(xmlDoc).find("add-item").each(function() {
                var $itemXml = $(this);
                var itemId = $itemXml.attr("id");
                if(BDA.itemTree.get(itemId) === undefined)
                {
                    var rawItemXml = $itemXml[0].outerHTML;
                   // console.log("Add item to item tree : " + rawItemXml + " with ID : " + itemId);
                    BDA.itemTree.set(itemId, rawItemXml);
                    var descriptor = $itemXml.attr("item-descriptor");
                    var $itemDesc = $xmlDef.find("item-descriptor[name=" + descriptor + "]");
                    var superType = $itemDesc.attr("super-type");
                    while(superType !== undefined)
                    {
                        var $parentDesc = $xmlDef.find("item-descriptor[name=" + $itemDesc.attr("super-type") + "]");
                        // console.log("Add super type : " + $parentDesc.attr("name"));
                        $itemDesc = $itemDesc.add($parentDesc);
                        superType = $parentDesc.attr("super-type");
                    }
                    // One to One relation
                    $itemDesc.find('property[item-type]')
                        .each(function(index, elm) {
                        var $elm = $(elm);
                        var subProperty = $elm.attr("name");
                        //console.log(subProperty);
                        var subId = $itemXml.find("set-property[name="+subProperty+"]").text();
                        if ($elm.attr("repository") === undefined && subId.length > 0)
                        {
                            // avoid infinite recursion
                            if(BDA.itemTree.get(subId) === undefined)
                            {
                                //console.log({'id' : subId, 'desc' : $elm.attr("item-type")});
                                subItems.push({'id' : subId, 'desc' : $elm.attr("item-type")});
                            }
                        }
                    });

                    // One to Many relation with list, array or map
                    $itemDesc.find('property[component-item-type]')
                    .each(function(index, elm) {
                        var $elm = $(elm);
                        var subProperty = $elm.attr("name");
                        // console.log(subProperty);
                        var subId = $itemXml.find("set-property[name="+subProperty+"]").text();
                        if ($elm.attr("repository") === undefined && subId.length > 0)
                        {
                            var desc = $elm.attr("component-item-type");
                            if(subId.indexOf(",") != -1 || subId.indexOf("=") != -1 )
                            {
                                var splitChar = ",";
                                if(subId.indexOf("=") != -1)
                                    splitChar = "=";
                                var ids = subId.split(splitChar);
                                for(var i = 0; i != ids.length; i++)
                                {
                                  if(BDA.itemTree.get(ids[i]) === undefined)
                                      subItems.push({'id' : ids[i], 'desc' : desc});
                                }
                            }
                            else
                            {
                              if(BDA.itemTree.get(subId) === undefined)
                                  subItems.push({'id' : subId, 'desc' : desc});
                            }
                        }
                    });
                }

            });

            console.log(subItems.length  + " items to retrieved in next request. Limit reach : " + (BDA.nbItemReceived >= maxItem));
            if (subItems.length > 0 && BDA.nbItemReceived < maxItem)
                BDA.getSubItems(subItems, $xmlDef, maxItem, outputType, printRepoAttr);
            else
              BDA.renderItemTreeTab(outputType, printRepoAttr, $xmlDef);
          },
        });
      }
      else
        console.log("Request is empty, nothing to do.");
        },

        getItemTree : function(id, descriptor, maxItem, outputType, printRepoAttr)
        {
          console.log("getItemTree - start");

          // reset divs
          $("#itemTreeResult").empty();
      $("#itemTreeInfo").empty();

      if (!id)
      {
        $("#itemTreeInfo").html("<p>Please provide a valid ID</p>");
        return ;
      }

      BDA.startGettingTree = new Date().getTime();

          // Get XML definition of the repository
      $("#itemTreeInfo").html("<p>Getting XML definition of this repository...</p>");
        var $xmlDef = BDA.processRepositoryXmlDef("definitionFiles", function($xmlDef){
        if (!$xmlDef)
        {
          $("#itemTreeInfo").html("<p>Unable to parse XML definition of this repository !</p>");
          return ;
        }
        console.log("descriptor : " + $xmlDef.find("item-descriptor").size());
        // get tree
        BDA.itemTree = new Map();
        BDA.nbItemReceived = 0;
        BDA.getSubItems([{'id' : id, 'desc' : descriptor}], $xmlDef, maxItem, outputType, printRepoAttr);
          });
        },

        renderItemTreeTab : function(outputType, printRepoAttr, $xmlDef)
        {
          console.log("Render item tree tab : " + outputType);
      $("#itemTreeInfo").empty();
      $("#itemTreeResult").empty();
      var res = "";
          if(outputType !== "HTMLtab")
          {
          console.log("Render copy button");
          $("#itemTreeInfo").append("<input type='button' id='itemTreeCopyButton' value='Copy result to clipboard'></input>");
              $('#itemTreeCopyButton').click(function(){
                  BDA.copyToClipboard($('#itemTreeResult').text());
              });
          }
          if(outputType == "addItem")
          {
            BDA.itemTree.forEach(function(data, id) {
              if (printRepoAttr)
              {
                var xmlDoc = jQuery.parseXML(data);
                var $itemXml = $(xmlDoc).find("add-item");
                $itemXml.attr("repository", BDA.getCurrentComponentPath());
                res += $itemXml[0].outerHTML;
              }
              else
                res += data;
              res += "\n\n";
            }, BDA.itemTree);

            res = "<import-items>\n" + res + "\n</import-items>";
            $("#itemTreeResult").append("<pre />");
            $("#itemTreeResult pre").text(res);
          }
          else if (outputType == "HTMLtab")
          {
              BDA.itemTree.forEach(function(data, id) {
                res += data;
              }, BDA.itemTree);
          BDA.showXMLAsTab(res, $xmlDef, $("#itemTreeResult"), true);
          }
          else if (outputType == "removeItem" || outputType == "printItem")
          {
            BDA.itemTree.forEach(function(data, id) {
              var xmlDoc = jQuery.parseXML(data);
              var $itemXml = $(xmlDoc).find("add-item");
              res += "<";
              if (outputType == "removeItem")
                res += "remove-item";
              else
                res += "print-item";
              res += ' id="' + $itemXml.attr("id") + '" item-descriptor="' +  $itemXml.attr("item-descriptor") + "\"";
              if (printRepoAttr)
                res += " repository='"+ BDA.getCurrentComponentPath() +"'";
              res += ' />\n';
            }, BDA.itemTree);

            $("#itemTreeResult").append("<pre />");
            $("#itemTreeResult pre").text(res);
          }

          var endGettingTree = new Date();
          var time = endGettingTree.getTime() - BDA.startGettingTree;
          console.log("time to get item tree : " + time + "ms");
        },

        createSpeedbar : function()
        {
          var speedBarHtml = "<a class='close' href='javascript:void(0)'><i class='fa fa-times'></i></a><p>Quick links :</p><ul>";
          $("#itemTreeResult .dataTable").each(function(index) {
            var $tab = $(this);
            var id =  $tab.attr("id");
            var name = id;
            if (id.indexOf("_") != -1)
            {
              var tab = id.split("_");
              name = tab[1];
            }
            var nbItem = $tab.find("td").size() / $tab.find("tr").size();
            speedBarHtml += "<li><i class='fa fa-arrow-right'></i>&nbsp;&nbsp;<a href='#" + id + "'>" + name.trim() + " (" + nbItem + ")</a></li>";
          });
          speedBarHtml += "</ul>";
          $("#itemTreeInfo").append("<div id='speedbar'><div id='widget' class='sticky'>" + speedBarHtml + "</div></div>");
          $('#speedbar .close').click(function() {
            $("#speedbar").fadeOut(200);
          });
            var stickyTop = $('.sticky').offset().top;
            $(window).scroll(function(){ // scroll event
              var windowTop = $(window).scrollTop();
              if (stickyTop < windowTop)
                $('.sticky').css({ position: 'fixed', top: 100 });
              else
                $('.sticky').css('position','static');
            });
        },

        //UTILS

        logTrace : function (msg){
          if(this.isLoggingTrace){
            console.log(msg);
          }
        },

        unique : function (array){
          var n = {},r=[];
          for(var i = 0; i < array.length; i++) 
          {
            if (!n[array[i]]) 
            {
              n[array[i]] = true; 
              r.push(array[i]); 
            }
          }
          return r;
        },

        sort : function (array){
          BDA.logTrace('beforeSort : ' + array)
          var sorted=array.sort(function(a,b) {
                if(a !=null){
                  return a.localeCompare(b, 'en', { caseFirst: 'upper' })
                }else if( b!=null){
                  return -1;
                }else{
                  return 0;
                }
          });
          BDA.logTrace('after sort : ' + sorted)
          return sorted;
        }

    };

    // INIT BDA
    if (document.getElementById("oracleATGbrand") !== null || BDA.isOldDynamoFct())
    {
      console.log("Loading BDA");
      try
      {
        BDA.init();
      }
      catch(err)
      {
        console.log(err);
      }
    }
    else
    {
      console.log("BDA script not starting");
    }

  }catch(e){
    console.log(e);
  }
});