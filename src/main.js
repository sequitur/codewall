import $ from "jquery";
import hl from "highlight.js";
import html2canvas from 'html2canvas';
import {
  CanvasTexture, Scene, OrthographicCamera, WebGLRenderer, Mesh,
  PlaneGeometry, MeshLambertMaterial, HemisphereLight, PointLight, DoubleSide
  } from 'three';

let currentText;
let displayRunning;
let hideComments;

/* UI Code */

function displayError (errMsg) {
  $("#error-msg").text(errMsg);
  $("#url-form,#loading,#content").hide();
  $("#error").show();
}

const canvas = document.getElementById('draw-canvas');
const renderer = new WebGLRenderer({ canvas });
const planeMaterial = new MeshLambertMaterial( {
  side: DoubleSide
} );
renderer.setSize(window.innerWidth, window.innerHeight);

window.ortho = false;

function createWebGLDisplay () {
  const frustumSize = 500;
  const aspect = window.innerWidth / window.innerHeight;
  const scene = new Scene();
  const cameraOrtho = new OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 10, 2000 );
  const geometry = new PlaneGeometry( frustumSize * aspect, frustumSize, 16 );
  const plane = new Mesh( geometry, planeMaterial );
  scene.add( plane );
  scene.add(new HemisphereLight(0xffffff, 0x444444));
  const pointLight = new PointLight(0xffffff, 2, 500, 2);
  pointLight.position.set(100, 200, 150);
  scene.add(pointLight);
  cameraOrtho.position.z = 100;
  cameraOrtho.lookAt(scene.position);
  function animate () {
    requestAnimationFrame(animate);
    renderer.render(scene, cameraOrtho);
  }
  animate();
  displayRunning = true;
}


function displayOnCanvas (texCanvas) {
  $('#content').hide();
  const texture = new CanvasTexture(texCanvas);
  planeMaterial.map = texture;
  texture.needsUpdate = true;
  if (!displayRunning) createWebGLDisplay();
  $("#loading,#url-form,#error").hide();
}

function displayContent (content) {
  const elem = $("#content");
  const highlightedContent = hl.highlightAuto(content).value
  const fixedContent = highlightedContent.replace(/\s+/g, " ");
  elem.html(fixedContent);
  elem.attr("class", $("select[name=styleSelect]").val());
  if (hideComments) elem.addClass('hide-comments');
  $("button[name=reset]").show();
  elem.show();
  html2canvas(elem[0]).then(displayOnCanvas);
}

function reset () {
  $("button[name=reset]").hide();
  $("#url-form").show();
}

function obj2InlineStyle (obj) {
  const styles = [];
  Object.keys(obj).forEach((key) => {
    styles.push(`${key}: ${obj.key};`);
  });
  return styles.join(' ');
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
        currentText = reader.result;
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
    hideComments = val;
  },

  hideOptions (val) {
    $("#style-menu").toggleClass("hide", val);
  }
}

$("#style-menu select,#style-menu input").on("change", function (event) {
  const {name, value} = event.target;
  optionActions[name](value);
  if (!displayRunning) return;
  $("button[name=redraw]").show();
});

function redraw () {
  $("#loading").show();
  $("button[name=redraw]").hide();
  // Hack to stop the UI from blocking before "loading" text shows up.
  window.setTimeout(() => {
    displayContent(currentText);
  }, 100);
}

$("button[name=reset]").on("click", reset);
$("button[name=redraw]").on("click", redraw);
