import $ from "jquery";
import hl from "highlight.js";

/* UI Code */

function displayError (errMsg) {
  $("#error-msg").text(errMsg);
  $("#url-form,#loading,#content").hide();
  $("#error").show();
}

function displayContent (content) {
  const elem = $("#content");
  const highlightedContent = hl.highlightAuto(content).value
  const fixedContent = highlightedContent.replace(/\s+/g, " ");
  elem.html(fixedContent);
  elem.attr("class", $("select[name=styleSelect]").val());
  $("#loading,#url-form,#error").hide();
  elem.show();
  $("button[name=reset]").show();
}

function reset () {
  $("button[name=reset]").hide();
  $("#url-form").show();
}

/* Get file from github */
function getUrl (url) {
  return fetch(
    url.replace(/^https?:\/\/github.com/, "https://raw.githubusercontent.com")
    .replace(/\/blob\//, '/')
  )
  .then(response => {
    if (response.status !== 200) throw new Error(
      `Check your URL, server returned status ${response.status}.`
    )
    return response.blob();
  });
}

$('#try-again').on('click', function () {
  $('#error').hide();
  $('#url-form').show();
});

$("#url-form").on("submit", function (event) {
  event.preventDefault();
  $("#url-form").hide();
  $("#loading").show();
  getUrl($("#url-form input").val())
    .then(blob => {
      if (blob.type !== "text/plain")
        throw new Error("This doesn't appear to be a text file.");
      const reader = new FileReader;
      reader.addEventListener("loadend", () => {
        displayContent(reader.result);
      });
      reader.readAsText(blob);
    })
    .catch(displayError);
});

const STYLE_CLASSES = "venturis weyland-yutani";

const optionActions = {
  styleSelect (val) {
    $("#content").removeClass(STYLE_CLASSES);
    $("#content").addClass(val);
  },

  fontSize (val) {
    $("#content").css("font-size", `${val}px`);
  },

  hideComments (val) {
    $("#content").toggleClass("hide-comments", val);
  },

  hideOptions (val) {
    $("#style-menu").toggleClass("hide", val);
  }
}

$("#style-menu select,#style-menu input").on("change", function (event) {
  const {name, value} = event.target;
  return optionActions[name](value);
});

$("button[name=reset]").on("click", reset);
