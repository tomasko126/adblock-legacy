var picreplacement = {

// data: {el, elType, blocked}
augmentIfAppropriate: function(data) {

  if (this._inHiddenSection(data.el)) {
    this._replaceHiddenSectionContaining(data.el);
  } else {
    var okTypes = (ElementTypes.image | ElementTypes.subdocument | ElementTypes["object"]);
    var replaceable = (data.el.nodeName !== "FRAME" && (data.elType & okTypes));
    if (data.blocked && replaceable) {
      this._replace(data.el);
    }
  }
},

// Given details about a picture and a target rectangle, return details
// about how to place the picture in the target.
//
// pic object contains
//   x - width
//   y - height
//   left - max crop allowed from left
//   right - max crop allowed from right
//   top - max crop allowed from top
//   bot - max crop allowed from bottom
//
// target object contains
//   x - width
//   y - height
//
// result object contains
//   x - width of background image to use (before crop)
//   y - height of background image to use (before crop)
//   top  - amount to offset top of photo in target to cause a vertical crop
//   left - amount to offset left of photo in target to cause a horizontal crop
//   width - width of visible area of result image
//   height - height of visible area of result image
//   offsettop  - amount to pad with blank space above picture
//   offsetleft - amount to pad with blank space to left of picture
//                These are used to center a picture in a tall or wide target
_fit: function (pic, target) {
  var p=pic, t=target;
  // Step 0: if t.ratio > p.ratio, rotate |p| and |t| about their NW<->SE axes.

  // Our math in Step 1 and beyond relies on |t| being skinner than |p|.  We
  // rotate |t| and |p| about their NW<->SE axis if needed to make that true.
  var t_ratio = t.x / t.y;
  var p_ratio = p.x / p.y;
  if (t_ratio > p_ratio) {
    var rotate = this._rotate;
    rotate(pic); rotate(target);
    var result = this._fit(pic, target);
    rotate(pic); rotate(target);
    rotate(result);
    return result;
  }

  // |t| is skinnier than |p|, so we need to crop the picture horizontally.

  // Step 1: Calculate |crop_x|: total horizontal crop needed.
  var crop_max = Math.max(p.left + p.right, .001);
  // Crop as much as we must, but not past the max allowed crop.
  var crop_x = Math.min(p.x - p.y * t_ratio, crop_max);

  // Step 2: Calculate how much of that crop should be done on the left side
  // of the picture versus the right.

  // We will execute the crop by giving a background-image a CSS left offset,
  // so we only have to calculate the left crop and the right crop will happen
  // naturally due to the size of the target area not fitting the entire image.

  var crop_left = p.left * (crop_x / crop_max);

  // Step 3: Calculate how much we must scale up or down the original picture.

  var scale = t.x / (p.x - crop_x);

  // Scale the original picture and crop amounts in order to determine the width
  // and height of the visible display area, the x and y dimensions of the image
  // to display in it, and the crop amount to offset the image.  The end result
  // is an image positioned to show the correct pixels in the target area.

  var result = {};
  result.x = Math.round(p.x * scale);
  result.y = Math.round(p.y * scale);
  result.left = Math.round(crop_left * scale);
  result.width = Math.round(t.x);
  result.height = Math.round(result.y);

  // Step 4: Add vertical padding if we weren't allowed to crop as much as we
  // liked, resulting in an image not tall enough to fill the target.
  result.offsettop = Math.round((t.y - result.height) / 2);

  // Done!
  result.top = 0;
  result.offsetleft = 0;
  return result;
},

// Rotate a picture/target about its NW<->SE axis.
_rotate: function(o) {
  var pairs = [ ["x", "y"], ["top", "left"], ["bot", "right"],
                ["offsettop", "offsetleft"], ["width", "height"] ];
  pairs.forEach(function(pair) {
    var a = pair[0], b = pair[1], tmp;
    if (o[a] || o[b]) {
      tmp = o[b]; o[b] = o[a]; o[a] = tmp; // swap
    }
  });
},

_dim: function(el, prop) {
  function intFor(val) {
    // Match two or more digits; treat < 10 as missing.  This lets us set
    // dims that look good for e.g. 1px tall ad holders (cnn.com footer.)
    var match = (val || "").match(/^([1-9][0-9]+)(px)?$/);
    if (!match) {
      return undefined;
    }
    return parseInt(match[1]);
  }
  return ( intFor(el.getAttribute(prop)) ||
           intFor(window.getComputedStyle(el)[prop]) );
},

_parentDim: function(el, prop) {
  // Special hack for Facebook, so Sponsored links are huge and beautiful
  // pictures instead of tiny or missing.
  if (/facebook/.test(document.location.href))
    return undefined;
  var result = undefined;
  while (!result && el.parentNode) {
    result = this._dim(el.parentNode, prop);
    el = el.parentNode;
  }
  return result;
},

_targetSize: function(el) {
  var t = { x: this._dim(el, "width"), y: this._dim(el, "height") };
  // Make it rectangular if ratio is appropriate, or if we only know one dim
  // and it's so big that the 180k pixel max will force the pic to be skinny.
  if (t.x && !t.y && t.x > 400)
    t.type = "wide";
  else if (t.y && !t.x && t.y > 400)
    t.type = "tall";
  else if (Math.max(t.x,t.y) / Math.min(t.x,t.y) >= 1.5) // false unless (t.x && t.y)
    t.type = (t.x > t.y ? "wide" : "tall");

  if (!t.type) // we didn't choose wide/tall
    t.type = ((t.x || t.y) > 125 ? "big" : "small");
  return t;
},

// Returns placement details to replace |el|, or null
// if we do not have enough info to replace |el|.
_placementFor: function(el) {
  var piccolors = [ "red", "green", "blue", "magenta", "orange", "yellow" ];
  var t = this._targetSize(el);
  var selectedColorIndex = Math.floor(Math.random() * piccolors.length);
  var selectedColor = piccolors[selectedColorIndex];
  if (document.getElementsByClassName("picreplacement-" + selectedColor).length > 0) {
    // if the color is found, just use the next one
    selectedColorIndex++;
    if (selectedColorIndex >= piccolors.length) {
      selectedColorIndex = 0;
    }
    selectedColor = piccolors[selectedColorIndex];
  }
  var pics = this._picdata[t.type][selectedColor];
  var pic = pics[Math.floor(Math.random() * pics.length)];
  // loop through available pics to find a best match,
  // otherwise we'll use a random one
  if (t.x) {
    var candidatePic = null;
    var minDiff = -1;
    for (var i = 0; i < pics.length; i++) {
      var cp = pics[i];
      var diff = Math.abs(cp.x - t.x);
      if (minDiff == -1 || diff < minDiff) {
          candidatePic = cp;
          minDiff = diff;
      }
    }
    if (minDiff != -1 && candidatePic != null) {
        pic = candidatePic;
    }

    // now see if we can best fit on y
    if (t.y) {
        var minDiff = -1;
        for (var i = 0; i < pics.length; i++) {
            var cp = pics[i];
            var diff = Math.abs(cp.y - t.y);
            if (t.x == cp.x && (minDiff == -1 || diff < minDiff)) {
                candidatePic = cp;
                minDiff = diff;
            }
        }
        
        // if different then set new candidate
        if (candidatePic != pic) {
            pic = candidatePic;
        }
    }
  }

  // If we only have one dimension, we may choose to use the picture's ratio;
  // but don't go over 180k pixels (so e.g. 1000x__ doesn't insert a 1000x1000
  // picture (cnn.com)).  And if an ancestor has a size, don't exceed that.
  if (t.x && !t.y) {
    var newY = Math.round(Math.min(pic.y * t.x / pic.x, 180000 / t.x));
    var parentY = this._parentDim(el, "height");
    t.y = (parentY ? Math.min(newY, parentY) : newY);
  }
  if (t.y && !t.x) {
    var newX = Math.round(Math.min(pic.x * t.y / pic.y, 180000 / t.y));
    var parentX = this._parentDim(el, "width");
    t.x = (parentX ? Math.min(newX, parentX) : newX);
  }
  if (!t.x || !t.y || t.x < 40 || t.y < 40) {
    return null; // zero or unknown dims or too small to bother
  }

  var result = this._fit(pic, t);
  //TODO - update URL
  result.url = "https://adblockcdn.com/img/" + pic.filename + selectedColor + ".gif";
  console.log("url", result.url);
  result.info_url = pic.info_url;
  result.text = pic.text;
  result.color = selectedColor;
  return result;
},

// Given a target element, replace it with a picture.
// Returns the replacement element if replacement works, or null if the target
// element could not be replaced.
_replace: function(el) {
  var placement = this._placementFor(el);
  if (!placement) {
    return null; // don't know how to replace |el|
  }
  if (document.getElementsByClassName("picreplacement-image").length > 30) {
    return null; //we only want to show 2 ad per page
  }
  var newPic = document.createElement("img");
  newPic.classList.add("picreplacement-image");
  newPic.classList.add("picreplacement-" + placement.color);

  var css = {
    width: placement.width + "px",
    height: placement.height + "px",
    background: "url(" + placement.url + ") no-repeat",
    backgroundPosition: "-" + placement.left + "px -" + placement.top + "px",
    backgroundSize: placement.x + "px " + placement.y + "px",
    margin: placement.offsettop + "px " + placement.offsetleft + "px",
    // nytimes.com float:right ad at top is on the left without this
    "float": (window.getComputedStyle(el)["float"] || undefined)
  };

  for (var k in css) {
    newPic.style[k] = css[k];
  }
  // hotmail ad is position:absolute; we must match its placement.
  // battefield.play4free.net imgs are absolute; ad is not img. match it.
  // reddit homepage sometimes gets a whole screenful of white if
  // inserted <img> is inline instead of block like what it replaces.
  for (var k in {position:1,left:1,top:1,bottom:1,right:1,display:1}) {
    newPic.style[k] = window.getComputedStyle(el)[k];
  }

  // Prevent clicking through to ad
  newPic.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, false);


  this._addInfoCardTo(newPic, placement);

  // No need to hide the replaced element -- regular AdBlock will do that.
  el.dataset.picreplacementreplaced = "true";
  el.parentNode.insertBefore(newPic, el);
  return newPic;
},

// Add an info card to |newPic| that appears on hover.
_addInfoCardTo: function(newPic, placement) {
  if (newPic.infoCard)
    return;
  // We use a direct sendRequest onmouseenter to avoid modifying
  // emit_page_broadcast; we won't need this hovercard long though, after which
  // the code can all be deleted.  Create card the first time we mouseover.
  // Then we can use jQuery's mouseenter and mouseleave to control when the
  // card comes and goes.
  newPic.addEventListener("mouseover", function(e) {
    if (newPic.infoCard)
      return; // already created card
    function after_jquery_is_available() {
      var cardsize = {
        width: Math.max(placement.width, 200),
        height: Math.max(placement.height, 175)
      };
      function position_card(card) {
        var pos = $(newPic).offset();
        pos.top += (placement.height - cardsize.height) / 2;
        pos.left += (placement.width - cardsize.width) / 2;
        if (pos.top < 0) {
           pos.top = 0;
        }
        if (pos.left < 0) {
           pos.left = 0;
        }
        card.css(pos);
      };

      // CARD DIV
      newPic.infoCard = $("<div>", {
        "class": "picreplacement-infocard",
        css: {
          "position": "absolute",
          "width": cardsize.width,
          "min-height": cardsize.height,
          "z-index": 1000000,
          "padding": 0,
          "box-sizing": "border-box",
          "border": "2px solid yellow",
          "font": "normal small Arial, sans-serif",
          "background-color": "rgba(0, 0, 0, 0.8)"
        } });
      newPic.infoCard.appendTo("body");

      // ICON IMAGE
      newPic.infoCard
        .append($("<img>", {
          css: {
            position: "absolute",
            top: 0,
            right: 0,
            // independent.co.uk borders all imgs
            border: "none",
          },
          src: chrome.extension.getURL("img/icon24.png")
        }))

      newPic.infoCard
        .append($("<img>", {
          css: {
            position: "absolute",
            top: 0,
            left: 0,
            width: 20,
            height: 20,
            // independent.co.uk borders all imgs
            border: "none",
          },
          src: chrome.extension.getURL("img/close_icon.png"),
          click: function(e) {
            newPic.infoCard.remove();
            newPic.remove();
          }
        }))

      // BANNER WRAPPER
      var wrapper = $("<div>", {
        css: {
          "margin": "0 auto",
          "text-align": "center",
          "width": "100%",
          "height": "100%"
        }
      });

      // CONTENT CONTAINER
      var content_container = $("<div>", {
        css: {
          "margin": "0 auto",
          "text-align": "center",
          "width": "100%",
          "display": "table"
        }
      });


      // CONTENT WRAPPER
      var content_wrapper = $("<div>", {
        css: {
            "display": "table-cell",
            "vertical-align": "middle"
        }
      });

      var translate = picreplacement.translate;

      // BANNER TITLE (TODAY IS NATIONAL ETC)
      var header = $("<div>", {
          css: {
            "display": "table",
            "background-color": "yellow",
            "margin": "auto",
            "min-height": "20px",
            "width": "100%",
          },
          html: $("<div>", {
            text: translate("title"),
            css: {
              "display": "table-cell",
              "vertical-align": "middle",
              "color": "black",
              "font-weight": "bold",
              "padding": "0 24px",
            }
          })
        }) 
      wrapper.append(header);

        content_wrapper.
        // CONTENT PITCH (WHO'S ARTICLE)
        append($("<div>", {
          css: {
              "margin": "0 5%",
          },
          html: $("<p>", {
              css: {
                  "text-align": "center",
                  "color": "white",
                  "font-weight": "bold",
              },
              text: translate(placement.text) + " "
          })
        })).              

        // READ ON AMNESTY 
        append($("<div>", {
            css: {
            },
            html: $("<button>", {
                css: {
                  "padding": "5px",
                  "margin": "12px 5px",
                  "background": "yellow",
                  "border": "0",
                },
                html: $("<a>", {
                  href: placement.info_url,
                  target: "_blank",
                  text: translate("learn_more"),
                  css: {
                      "text-decoration": "none",
                      "text-transform": "uppercase",
                      "font-weight": "bold",
                      "letter-spacing": "-0.5px"
                  }
                })
            })
        }))

      // STOP SHOWING BUTTON 
      $("<div>", {
        css: {
        },
        html: $("<p>", {
            text: translate("stop_showing"),
            css: {
                "opacity": ".8",
                "color": "white",
                "font-size": "10px",
                "cursor": "pointer",
                "text-decoration": "underline",
				"margin-bottom": "35px",
            }
          }).
            click(function() {
              BGcall("set_setting", "do_picreplacement", false, function() {
                $(".picreplacement-image, .picreplacement-infocard").remove();
                alert(translate("ok_no_more"));
              });
            }),
      }).
        appendTo(content_wrapper); 

       content_wrapper.appendTo(content_container); 
       content_container.appendTo(wrapper); 

      $("<br>").appendTo(wrapper);

      // WHY ARE WE DOING THIS??!?!
      var footer = $("<div>", {
          css: {
              "min-height": "30px",
              "background": "black",
              "position": "absolute",
              "width": "100%",
              "bottom":"0",
              "display": "table",
          },
          html: $("<a>", {
              css: {
                "color": "yellow",
                "font-weight": 550,
                "font-size": "12px",
                "vertical-align": "middle",
                "display": "table-cell",
              },        
              href: "http://getadblock.com/why",
              target: "_blank",
              text: translate("why")
          })
      });
      footer.appendTo(wrapper);
      wrapper.appendTo(newPic.infoCard);
      //wrapper.css("margin-top", (newPic.infoCard.height() - wrapper.height()) / 2);

      // Now that all the elements are on the card so it knows its height...
      position_card(newPic.infoCard);

      newPic.infoCard.css({
          "height": content_container.height() + header.height() + footer.height(),
      });
      content_container.css({
          "height": newPic.infoCard.height() - header.height(),
      });

      wrapper.css({
          "height": newPic.infoCard.height() - header.height(),
      });
      content_container.css({
          "height": newPic.infoCard.height() - header.height(),
      });


      $(newPic).mouseover(function() {
        $(".picreplacement-infocard:visible").hide();
        // newPic may have moved relative to the document, so recalculate
        // position before showing.
        position_card(newPic.infoCard);
        newPic.infoCard.show();
      });
      // Known bug: mouseleave is not called if you mouse over only 1 pixel
      // of newPic, then leave.  So infoCard is not removed.
      newPic.infoCard.mouseleave(function() {
        //$(".picreplacement-infocard:visible").hide();
      });

      // The first time I show the card, the button is disabled.  Enable after
      // a moment so the user can read the card first.
      window.setTimeout(function() {
        newPic.infoCard.find("input").
          attr("disabled", null).
          animate({opacity: 1});
      }, 2000);
    }
    if (typeof jQuery !== "undefined") {
      after_jquery_is_available();
    }
    else {
      chrome.extension.sendRequest(
        { command:"picreplacement_inject_jquery", allFrames: (window !== window.top) },
        after_jquery_is_available
      );
    }
  }, false);
},

// Returns true if |el| or an ancestor was hidden by an AdBlock hiding rule.
_inHiddenSection: function(el) {
  return window.getComputedStyle(el).orphans === "4321";
},

// Find the ancestor of el that was hidden by AdBlock, and replace it
// with a picture.  Assumes _inHiddenSection(el) is true.
_replaceHiddenSectionContaining: function(el) {
  // Find the top hidden node (the one AdBlock originally hid)
  while (this._inHiddenSection(el.parentNode))
    el = el.parentNode;
  // We may have already replaced this section...
  if (el.dataset.picreplacementreplaced)
    return;

  var oldCssText = el.style.cssText;
  el.style.setProperty("visibility", "hidden", "important");
  el.style.setProperty("display", "block", "important");

  this._replace(el);

  el.style.cssText = oldCssText; // Re-hide the section
},

translate: function(key) {
  var text = {
    "explanation": {
      en: "AdBlock for the Apple Watch!",
      es: "AdBlock ahora muestra los gatos en lugar de anuncios!",
      fr: "Dorénavant AdBlock affichera des chats à la place des publicités!",
      de: "AdBlock ersetzt ab heute Werbung durch Katzen!",
      ru: "AdBlock теперь отображается кошек вместо рекламы!",
      nl: "AdBlock toont je nu katten in plaats van advertenties!",
      zh: "现在显示的AdBlock猫，而不是广告！",
    },
    "title": {
      en: "Today is World Day Against Cyber Censorship!",
      es: "AdBlock ahora muestra los gatos en lugar de anuncios!",
      fr: "Dorénavant AdBlock affichera des chats à la place des publicités!",
      de: "AdBlock ersetzt ab heute Werbung durch Katzen!",
      ru: "AdBlock теперь отображается кошек вместо рекламы!",
      nl: "AdBlock toont je nu katten in plaats van advertenties!",
      zh: "现在显示的AdBlock猫，而不是广告！",
    },
    "stop_showing": {
      en: "Stop showing me these banners!",
      es: "No mostrar los gatos!",
      fr: "Arrêter l'affichage des chats!",
      de: "Keine Katzen mehr anzeigen!",
      ru: "Не показывать кошек!",
      nl: "Toon geen katten meer!",
      zh: "不显示猫图片！",
    },
    "why": {
      en: "WHY DID ADBLOCK ALLOW THIS \"AD\" TODAY?",
      es: "No mostrar los gatos!",
      fr: "Arrêter l'affichage des chats!",
      de: "Keine Katzen mehr anzeigen!",
      ru: "Не показывать кошек!",
      nl: "Toon geen katten meer!",
      zh: "不显示猫图片！",
    },
    "ok_no_more": {
      en: "OK, AdBlock will not show you any more AdBlock Apple Watch ads.\n\nHappy April Fools' Day!",
      es: "OK, AdBlock no te mostrará los gatos.\n\nFeliz Día de los Inocentes!",
      fr: "OK, AdBlock n'affichera plus de chats.\n\nJ'espère que mon poisson d'avril vous a plu!",
      de: "AdBlock wird keine Katzen mehr anzeigen.\n\nApril, April!",
      ru: "Хорошо, AdBlock не будет отображаться кошек.\n\nЕсть счастливый День дурака",
      nl: "1 April!!\n\nAdBlock zal vanaf nu geen katten meer tonen.",
      zh: "OK，的AdBlock不会显示猫。\n\n幸福四月愚人节！",
    },
    "new": {
      en: "New!",
      es: "Nuevo!",
      fr: "Nouveau!",
      de: "Neu!",
      ru: "новое!",
      nl: "Nieuw!",
      zh: "新！",
    },
    "enable_picreplacement": {
      en: "Display a pretty picture in place of ads.",
      es: "Mostrar una foto bonita en lugar de anuncios.",
      fr: "Afficher des belles images à la place des publicités.",
      de: "Werbung durch schöne Bilder ersetzen.",
      ru: "Показать красивую картинку вместо объявления.",
      nl: "Toon een leuke afbeelding op de plaats waar advertenties stonden.",
      zh: "显示漂亮的照片，而不是广告。",
    },
    "learn_more": {
      en: "Read it on Amnesty.org >",
      es: "Más información",
      fr: "En savoir plus",
      de: "Mehr Informationen",
      ru: "Подробнее",
      nl: "Meer informatie",
      zh: "了解更多信息",
    },
    "snowden": {
      en: "\"EVEN IF YOU'RE NOT DOING ANYTHING WRONG, YOU'RE BEING WATCHED AND RECORDED\" - by Edward Snowden",
      es: "\"EVEN IF YOU'RE NOT DOING ANYTHING WRONG, YOU'RE BEING WATCHED AND RECORDED\" - by Edward Snowden",
      fr: "\"EVEN IF YOU'RE NOT DOING ANYTHING WRONG, YOU'RE BEING WATCHED AND RECORDED\" - by Edward Snowden",
      de: "\"EVEN IF YOU'RE NOT DOING ANYTHING WRONG, YOU'RE BEING WATCHED AND RECORDED\" - by Edward Snowden",
      ru: "\"EVEN IF YOU'RE NOT DOING ANYTHING WRONG, YOU'RE BEING WATCHED AND RECORDED\" - by Edward Snowden",
      nl: "\"EVEN IF YOU'RE NOT DOING ANYTHING WRONG, YOU'RE BEING WATCHED AND RECORDED\" - by Edward Snowden",
      zh: "\"EVEN IF YOU'RE NOT DOING ANYTHING WRONG, YOU'RE BEING WATCHED AND RECORDED\" - by Edward Snowden",
    },
    "aiweiwei": {
      en: "\"WITHOUT FREEDOM OF SPEECH THERE IS NO MODERN WORLD, JUST A BARBARIC ONE\" - by Ai Wei Wei",
      es: "\"WITHOUT FREEDOM OF SPEECH THERE IS NO MODERN WORLD, JUST A BARBARIC ONE\" - by Ai Wei Wei",
      fr: "\"WITHOUT FREEDOM OF SPEECH THERE IS NO MODERN WORLD, JUST A BARBARIC ONE\" - by Ai Wei Wei",
      de: "\"WITHOUT FREEDOM OF SPEECH THERE IS NO MODERN WORLD, JUST A BARBARIC ONE\" - by Ai Wei Wei",
      ru: "\"WITHOUT FREEDOM OF SPEECH THERE IS NO MODERN WORLD, JUST A BARBARIC ONE\" - by Ai Wei Wei",
      nl: "\"WITHOUT FREEDOM OF SPEECH THERE IS NO MODERN WORLD, JUST A BARBARIC ONE\" - by Ai Wei Wei",
      zh: "\"WITHOUT FREEDOM OF SPEECH THERE IS NO MODERN WORLD, JUST A BARBARIC ONE\" - by Ai Wei Wei",
    },
    "pussyriot": {
      en: "\"AUTHORITIES DON'T JUST USE HANDCUFFS AND ARRESTS, BUT ALSO MEDIA ATTACKS\" - by Pussy Riot",
      es: "\"AUTHORITIES DON'T JUST USE HANDCUFFS AND ARRESTS, BUT ALSO MEDIA ATTACKS\" - by Pussy Riot",
      fr: "\"AUTHORITIES DON'T JUST USE HANDCUFFS AND ARRESTS, BUT ALSO MEDIA ATTACKS\" - by Pussy Riot",
      de: "\"AUTHORITIES DON'T JUST USE HANDCUFFS AND ARRESTS, BUT ALSO MEDIA ATTACKS\" - by Pussy Riot",
      ru: "\"AUTHORITIES DON'T JUST USE HANDCUFFS AND ARRESTS, BUT ALSO MEDIA ATTACKS\" - by Pussy Riot",
      nl: "\"AUTHORITIES DON'T JUST USE HANDCUFFS AND ARRESTS, BUT ALSO MEDIA ATTACKS\" - by Pussy Riot",
      zh: "\"AUTHORITIES DON'T JUST USE HANDCUFFS AND ARRESTS, BUT ALSO MEDIA ATTACKS\" - by Pussy Riot",
    },
    "northkorea": {
      en: "\"WITHOUT A PHONE TO CALL OUT OF THE COUNTRY, I'D NEVER HAVE LEARNT MY PARENTS WERE ALIVE; I'D HAVE LIVED AND DIED IN NORTH KOREA\" - by Choi Ji-woo",
      es: "\"WITHOUT A PHONE TO CALL OUT OF THE COUNTRY, I'D NEVER HAVE LEARNT MY PARENTS WERE ALIVE; I'D HAVE LIVED AND DIED IN NORTH KOREA\" - by Choi Ji-woo",
      fr: "\"WITHOUT A PHONE TO CALL OUT OF THE COUNTRY, I'D NEVER HAVE LEARNT MY PARENTS WERE ALIVE; I'D HAVE LIVED AND DIED IN NORTH KOREA\" - by Choi Ji-woo",
      de: "\"WITHOUT A PHONE TO CALL OUT OF THE COUNTRY, I'D NEVER HAVE LEARNT MY PARENTS WERE ALIVE; I'D HAVE LIVED AND DIED IN NORTH KOREA\" - by Choi Ji-woo",
      ru: "\"WITHOUT A PHONE TO CALL OUT OF THE COUNTRY, I'D NEVER HAVE LEARNT MY PARENTS WERE ALIVE; I'D HAVE LIVED AND DIED IN NORTH KOREA\" - by Choi Ji-woo",
      nl: "\"WITHOUT A PHONE TO CALL OUT OF THE COUNTRY, I'D NEVER HAVE LEARNT MY PARENTS WERE ALIVE; I'D HAVE LIVED AND DIED IN NORTH KOREA\" - by Choi Ji-woo",
      zh: "\"WITHOUT A PHONE TO CALL OUT OF THE COUNTRY, I'D NEVER HAVE LEARNT MY PARENTS WERE ALIVE; I'D HAVE LIVED AND DIED IN NORTH KOREA\" - by Choi Ji-woo",
    },
    "cuba": {
      en: "\"CUBA QUOTE ABOUT CUBE AND IT'S GOING TO BE ABOUT CUBA AND PROBABLY THIS LONG\" - by Someone",
      es: "\"CUBA QUOTE ABOUT CUBE AND IT'S GOING TO BE ABOUT CUBA AND PROBABLY THIS LONG\" - by Someone",
      fr: "\"CUBA QUOTE ABOUT CUBE AND IT'S GOING TO BE ABOUT CUBA AND PROBABLY THIS LONG\" - by Someone",
      de: "\"CUBA QUOTE ABOUT CUBE AND IT'S GOING TO BE ABOUT CUBA AND PROBABLY THIS LONG\" - by Someone",
      ru: "\"CUBA QUOTE ABOUT CUBE AND IT'S GOING TO BE ABOUT CUBA AND PROBABLY THIS LONG\" - by Someone",
      nl: "\"CUBA QUOTE ABOUT CUBE AND IT'S GOING TO BE ABOUT CUBA AND PROBABLY THIS LONG\" - by Someone",
      zh: "\"CUBA QUOTE ABOUT CUBE AND IT'S GOING TO BE ABOUT CUBA AND PROBABLY THIS LONG\" - by Someone",
    },
    "adblock": {
      en: "\"ADBLOCK IS THE BEST BLOCK, AND WE SORTA BLOCK INSTEAD OF BLOCK ALL THE BLOCKS\" - by AdBlock",
      es: "\"ADBLOCK IS THE BEST BLOCK, AND WE SORTA BLOCK INSTEAD OF BLOCK ALL THE BLOCKS\" - by AdBlock",
      fr: "\"ADBLOCK IS THE BEST BLOCK, AND WE SORTA BLOCK INSTEAD OF BLOCK ALL THE BLOCKS\" - by AdBlock",
      de: "\"ADBLOCK IS THE BEST BLOCK, AND WE SORTA BLOCK INSTEAD OF BLOCK ALL THE BLOCKS\" - by AdBlock",
      ru: "\"ADBLOCK IS THE BEST BLOCK, AND WE SORTA BLOCK INSTEAD OF BLOCK ALL THE BLOCKS\" - by AdBlock",
      nl: "\"ADBLOCK IS THE BEST BLOCK, AND WE SORTA BLOCK INSTEAD OF BLOCK ALL THE BLOCKS\" - by AdBlock",
      zh: "\"ADBLOCK IS THE BEST BLOCK, AND WE SORTA BLOCK INSTEAD OF BLOCK ALL THE BLOCKS\" - by AdBlock",
    }
  };
  var locale = navigator.language.substring(0, 2);
  var msg = text[key] || {};
  return msg[locale] || msg["en"];
},

_picdata: {
  "big": {
    "red": [
      { filename: "b_336_28_",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 336, y: 280, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_3___25_",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 300, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_25__25_",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 250, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_18__15_",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 180, y: 150, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "green": [
      { filename: "b_336_28_",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 336, y: 280, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_3___25_",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 300, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_25__25_",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 250, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_18__15_",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 180, y: 150, left: 0, right: 0, top: 0, bot: 0 },
   ],
    "blue": [
      { filename: "b_336_28_",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 336, y: 280, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_3___25_",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 300, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_25__25_",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 250, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_18__15_",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 180, y: 150, left: 0, right: 0, top: 0, bot: 0 },
     ],
    "magenta": [
      { filename: "b_336_28_",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 336, y: 280, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_3___25_",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 300, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_25__25_",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 250, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_18__15_",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 180, y: 150, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "orange": [
      { filename: "b_336_28_",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 336, y: 280, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_3___25_",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 300, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_25__25_",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 250, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_18__15_",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 180, y: 150, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "yellow": [
      { filename: "b_336_28_",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 336, y: 280, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_3___25_",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 300, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_25__25_",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 250, y: 250, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_18__15_",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 180, y: 150, left: 0, right: 0, top: 0, bot: 0 },
    ]
  },
  "small": {
    "red": [
    ],
    "green": [
   ],
    "blue": [
     ],
    "magenta": [
     ],
    "orange": [
     ],
    "yellow": [
     ]
  },
  "wide": {
    "red": [
      { filename: "b_728_9_",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 728, y: 90, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_468_6_",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 468, y: 60, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_234_6_",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 234, y: 60, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "green": [
      { filename: "b_728_9_",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 728, y: 90, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_468_6_",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 468, y: 60, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_234_6_",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 234, y: 60, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "blue": [
      { filename: "b_728_9_",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 728, y: 90, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_468_6_",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 468, y: 60, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_234_6_",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 234, y: 60, left: 0, right: 0, top: 0, bot: 0 },
     ],
    "magenta": [
      { filename: "b_728_9_",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 728, y: 90, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_468_6_",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 468, y: 60, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_234_6_",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 234, y: 60, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "orange": [
      { filename: "b_728_9_",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 728, y: 90, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_468_6_",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 468, y: 60, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_234_6_",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 234, y: 60, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "yellow": [
      { filename: "b_728_9_",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 728, y: 90, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_468_6_",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 468, y: 60, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_234_6_",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 234, y: 60, left: 0, right: 0, top: 0, bot: 0 },
    ]
  },
  "tall": {
    "red": [
      { filename: "b_16__6__",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 160, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__6__",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 120, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_24__4__",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 240, y: 400, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__24_",
        info_url: "https://getadblock.com/",
        text: "snowden",
        x: 120, y: 240, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "green": [
      { filename: "b_16__6__",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 160, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__6__",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 120, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_24__4__",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 240, y: 400, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__24_",
        info_url: "https://getadblock.com/",
        text: "aiweiwei",
        x: 120, y: 240, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "blue": [
      { filename: "b_16__6__",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 160, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__6__",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 120, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_24__4__",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 240, y: 400, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__24_",
        info_url: "https://getadblock.com/",
        text: "pussyriot",
        x: 120, y: 240, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "magenta": [
      { filename: "b_16__6__",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 160, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__6__",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 120, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_24__4__",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 240, y: 400, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__24_",
        info_url: "https://getadblock.com/",
        text: "northkorea",
        x: 120, y: 240, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "orange": [
      { filename: "b_16__6__",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 160, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__6__",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 120, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_24__4__",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 240, y: 400, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__24_",
        info_url: "https://getadblock.com/",
        text: "cuba",
        x: 120, y: 240, left: 0, right: 0, top: 0, bot: 0 },
    ],
    "yellow": [
      { filename: "b_16__6__",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 160, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__6__",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 120, y: 600, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_24__4__",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 240, y: 400, left: 0, right: 0, top: 0, bot: 0 },
      { filename: "b_12__24_",
        info_url: "https://getadblock.com/",
        text: "adblock",
        x: 120, y: 240, left: 0, right: 0, top: 0, bot: 0 },
    ]
  }
}

}; // end picreplacement
