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
  elem.attr("class", $("#style-select").val());
  $("#loading,#url-form,#error").hide();
  elem.show();
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

$("#style-select").on("change", function () {
  $("#content").attr("class", $("#style-select").val());
});
