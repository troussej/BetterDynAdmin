(function($) {
  "use strict";
  var BDA_XML_DEF = {

    tableInitialized: false,
    isXMLDefinitionFilePage: false,
    xmlDefinitionMaxSize: 150000, // 150 Ko
    templates: {
      itemDescTable: '<div class="panel panel-default">' +
        '<div class="panel-heading">' +
        '<h3 class="panel-title">{0}</h3>' +
        '</div>' +
        '<div class="panel-body">' +
        '<div class="row">' +
        '<table class="table item-descriptor-table" >'+
        '{1}' +
        '</table>'+
        '</div>' +
        '</div>' +
        '</div>',
      itemDescSubTable: '{0}',
      tableHeader: ['name', 'type', 'id-column-name', 'shared-table-sequence'],
      tableColumns: [
        'name', 'column-name', 'required', 'cache-mode', 'queryable', 'data-type', 'item-type'
      ],
    },


    build: function() {
      BDA_XML_DEF.isXMLDefinitionFilePage = BDA_XML_DEF.isXMLDefinitionFilePageFct();

      if (BDA_XML_DEF.isXMLDefinitionFilePage)
        BDA_XML_DEF.setupXMLDefinitionFilePage();

    },

    isXMLDefinitionFilePageFct: function() {
      return $("td:contains('class atg.xml.XMLFile')").length > 0 || $("td:contains('class [Latg.xml.XMLFile;')").length > 0;
    },

    setupXMLDefinitionFilePage: function() {

      BDA_XML_DEF.addDisplayXmlAsTableButton();

      var xmlSize = 0;
      $("pre").each(function(index) {
        xmlSize += $(this).html().length;
      });
      console.log("Xml size : " + xmlSize);
      if (xmlSize < BDA_XML_DEF.xmlDefinitionMaxSize) {
        highlightAndIndentXml($("pre"));
      } else {
        $("<p />")
          .html("The definition file is big, to avoid slowing down the page, XML highlight and indentation have been disabled. <br>" + "<button id='xmlHighlightBtn'>Highlight and indent now</button> <small>(takes few seconds)</small>")
          .insertAfter($("h3:contains('Value')"));

        $("#xmlHighlightBtn").click(function() {
          highlightAndIndentXml($("pre"));
        });
      }


    },

    addDisplayXmlAsTableButton: function() {

      var tableSection = $('<p id="xmlDefAsTableSection"></p>')

      .insertAfter($("h3:contains('Value')"))
        .append($('<button>Display as table</button>').on('click', BDA_XML_DEF.showXmlDefAsTable));

    },

    showXmlDefAsTable: function() {
      console.log('showXmlDefAsTable');
      if (!BDA_XML_DEF.tableInitialized) {
        BDA_XML_DEF.tableInitialized = true;
        BDA_XML_DEF.buildXmlDefAsTable();
      }
      $('#xmlDefAsTable').slideToggle();
    },

    buildXmlDefAsTable: function() {

      try {


        var $wrapper = $('<div class="twbs"></div></div>');
        $('#xmlDefAsTableSection').append($wrapper);
        var $container = $('<div  id="xmlDefAsTable"  style="display:none;" class="container-fluid">');
        $wrapper.append($container)

        var escapeXML = $("pre").first().html();
        var unescapeXML = $('<div/>').html(escapeXML).text();
        //hack: if we keep table, jquery doesn't like it as it's not a proper html table
        unescapeXML = unescapeXML.replace(new RegExp(/table/, 'g'), 'div');

        var $xmlDef = $(unescapeXML);
        var $panel, $itemDesc, $table, caption, headerFields, attr, rows, cols, $propertyDesc, val;
        $xmlDef.find('item-descriptor').each(function(idx, itemDesc) {
          $itemDesc = $(itemDesc);
          var subTables = [];
          $itemDesc.find('div').each(function(idx, table) {
            $table = $(table);
            headerFields = [];
            rows = [];

            //table def
            cols = [];
            for (var i = 0; i < BDA_XML_DEF.templates.tableHeader.length; i++) {
              attr = BDA_XML_DEF.templates.tableHeader[i];
              val = $table.attr(attr);
              if (isNull(val)) {
                val = "";
              }
              cols.push('<th>{0} : {1}</th>'.format(attr,val));
            }
            cols.push('<td  colspan="{0}"></td>'.format(BDA_XML_DEF.templates.tableColumns.length - BDA_XML_DEF.templates.tableHeader.length));
            rows.push('<tr class="table-def">{0}</tr>'.format(cols.join('')));

            //headers
            cols = [];
            for (var i = 0; i < BDA_XML_DEF.templates.tableColumns.length; i++) {
              attr = BDA_XML_DEF.templates.tableColumns[i];
              cols.push('<th>{0}</th>'.format(attr));
            }
            rows.push('<tr>{0}</tr>'.format(cols.join('')));

            //rows
            $table.find('property').each(function(idx, propertyDesc) {
              $propertyDesc = $(propertyDesc);
              cols = [];
              for (var i = 0; i < BDA_XML_DEF.templates.tableColumns.length; i++) {
                attr = BDA_XML_DEF.templates.tableColumns[i];
                val = $propertyDesc.attr(attr);
                if (isNull(val)) {
                  val = "";
                }
                cols.push('<td>{0}</td>'.format(val));
              }
              rows.push('<tr>{0}</tr>'.format(cols.join('')));
            })
            subTables.push(BDA_XML_DEF.templates.itemDescSubTable.format(rows.join('')));

          })

          $panel = $(
            BDA_XML_DEF.templates.itemDescTable.format($itemDesc.attr('name'), subTables.join(''))
          )

          $container.append($panel);


        })
        var $items = $container.find('.panel');
        $wrapper.prepend(
          $('<input type="text" placeholder="Search"/>')
          .on('keyup', function() {
            var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
            $items
              .show()
              .removeHighlight()
              .highlight(val)
              .filter(function() {
                var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
                return !~text.indexOf(val);
              })
              .hide();

          }));
      } catch (e) {
        console.error(e);
      }
    },

  };
  // Reference to BDA
  var BDA;
  // Jquery plugin creation
  $.fn.bdaXmlDef = function(pBDA) {
    console.log('Init plugin {0}'.format('bdaXmlDef'));
    //settings = $.extend({}, defaults, options);
    BDA = pBDA;
    BDA_XML_DEF.build();
    return this;
  };

})(jQuery);