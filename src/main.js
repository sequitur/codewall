/* Codewall main source file */
/* Turns code into A E S T H E T I C */
/* Copyright (C) 2017 Bruno Dias */

/* Imports... */
import $ from "jquery"; // For general DOM manipulation
import hl from "highlight.js"; // For syntax highlighting
import html2canvas from 'html2canvas'; // To use DOM elements as textures

// For WebGL wrangling
import {
  CanvasTexture, Scene, OrthographicCamera, WebGLRenderer, Mesh, Clock,
  PlaneGeometry, MeshLambertMaterial, HemisphereLight, PointLight, DoubleSide
} from 'three';

// For postprocessing effects
import {
  EffectComposer, GlitchPass, GlitchMode, RenderPass, BloomPass, FilmPass,
  KernelSize, PixelationPass, DotScreenPass
} from 'postprocessing';

// Ugly global vars
let currentText;
let currentURL;
let displayRunning;
let hideComments;

// Useful constants

const QUERY_OPTIONS = ["styleSelect", "aestheticSelect", "fontSize", "hideComments"];

/* Create the Scene */
const canvas = document.getElementById('draw-canvas');
const renderer = new WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const composer = new EffectComposer(renderer);

// The frustum size just sets the arbitrary unit scale of our scene.
const frustumSize = 500;
const aspect = window.innerWidth / window.innerHeight;

const scene = new Scene();

// The orthographic camera's frustum (viewing area) is just a rectangular box,
// unlike the pyramid-shaped frustum of a perspective camera. The four
// parameters are the distances between the left, right, top, and bottom sides
// from the center, which is initially at (0, 0, 0).
const cameraOrtho = new OrthographicCamera(
  frustumSize * aspect / - 2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  frustumSize / - 2, 10, 2000
);

// We want to render a 2D scene (our code) in 3D space. So we create a plane.
// Because the plane is the same size as the camera's frustum and the camera
// is orthographic, it will fill the entire view perfectly.
const planeMaterial = new MeshLambertMaterial({ side: DoubleSide });
let geometry = new PlaneGeometry( frustumSize * aspect, frustumSize, 16 );
let plane = new Mesh(geometry, planeMaterial);
scene.add(plane);

// Our plane uses a diffuse shader so it has to be lit for us to see what's on
// it. This achieves a slight gradient effect over the whole image without
// me having to write a shader to do it.
scene.add(new HemisphereLight(0xffffff, 0x444444));
const pointLight = new PointLight(0xffffff, 2, 500, 2);
pointLight.position.set(100, 200, 150);
scene.add(pointLight);

// Move the camera back a little bit so it can see the plane.
cameraOrtho.position.z = 100;
cameraOrtho.lookAt(scene.position);

// The different a e s t h e t i c s are different "stacks" of postprocessing
// effects, implemented here as functions. Every time we redraw we rebuild the
// effect stack according to what's selected in the UI.
const EFFECT_STACKS = {
  gibson (composer) {
    const glitch = new GlitchPass({
      dtSize: 512
    });
    const scanlines = new FilmPass({
      vignette: true,
      eskil: true,
      scanlineDensity: 14,
      scanlineIntensity: 0.1,
      vignetteOffset: 0.75,
      vignetteDarkness: 2
    });
    scanlines.renderToScreen = true;
    composer.addPass(glitch);
    composer.addPass(scanlines);
  },

  sadboy (composer) {
    const bloom = new BloomPass({
      kernelSize: KernelSize.SMALL,
      intensity: 5.0,
      distinction: 2.0,
    });
    const filmGrain = new FilmPass({
      vignette: true,
      eskil: true,
      scanlines: false,
      vignetteDarkness: 2.0,
    });
    filmGrain.renderToScreen = true;
    composer.addPass(bloom);
    composer.addPass(filmGrain);
  },

  scorchedtube (composer) {
    const bloom = new BloomPass({
      kernelSize: KernelSize.MEDIUM,
      intensity: 10.0,
      distinction: 2.0,
      screenMode: false,
    });
    const scanlines = new FilmPass({
      vignette: true,
      eskil: true,
      scanlineDensity: 14,
      scanlineIntensity: 0.1,
      vignetteOffset: 0.75,
      vignetteDarkness: 4,
    });
    scanlines.renderToScreen = true;
    composer.addPass(bloom);
    composer.addPass(scanlines);
  },

  ntef (composer) {
    const bloom = new BloomPass({
      kernelSize: KernelSize.SMALL,
      intensity: 5.0,
      distinction: 2.0,
    });
    const pixel = new PixelationPass(2.5);
    const scanlines = new FilmPass({
      vignette: true,
      eskil: true,
      scanlineDensity: 14,
      scanlineIntensity: 0.1,
      vignetteOffset: 0.75,
      vignetteDarkness: 2
    });
    scanlines.renderToScreen = true;
    composer.addPass(bloom);
    composer.addPass(pixel);
    composer.addPass(scanlines);
  },

  badlifechoices (composer) {
    const bloom = new BloomPass({
      kernelSize: KernelSize.SMALL,
      intensity: 5.0,
      distinction: 2.0,
    });
    const dots = new DotScreenPass({
      scale: 1.5
    });
    const filmGrain = new FilmPass({
      vignette: true,
      eskil: true,
      scanlines: false,
      vignetteDarkness: 2.0,
      noiseIntensity: 0.75
    });
    filmGrain.renderToScreen = true;
    composer.addPass(bloom);
    composer.addPass(dots);
    composer.addPass(filmGrain);
  },
}

// Set up the composer to use the currently-chosen effects stack.
function createEffectComposer (composer, scene, camera) {
  composer.reset();
  // Every effects stack starts by just rendering the scene.
  composer.addPass(new RenderPass(scene, camera));
  EFFECT_STACKS[$("select[name=aestheticSelect]").val()](composer);
}

// Fire up the WebGL canvas. We do this once we have loaded some content to use
// in it.
function createWebGLDisplay () {
  createEffectComposer(composer, scene, cameraOrtho);
  const clock = new Clock();

  function animate () {
    requestAnimationFrame(animate);
    composer.render(clock.getDelta());
  }

  animate();
  displayRunning = true;
}

// Once content has been fetched from the network, show it.
function displayContent (content) {
  const elem = $("#content");
  // Highlight the content with highlight.js
  const highlightedContent = hl.highlightAuto(content).value
  // Just in case, compress all whitespace into single spaces.
  const fixedContent = highlightedContent.replace(/\s+/g, " ");
  // Insert the content into html.
  elem.html(fixedContent);
  elem.attr("class", $("select[name=styleSelect]").val());
  if (hideComments) elem.addClass('hide-comments');
  // We have to show the element so html2canvas will properly work.
  elem.show();
  html2canvas(elem[0]).then(displayOnCanvas);
}

function generateQueryURL () {
  const queryString = new URLSearchParams();
  queryString.append("url", currentURL);
  QUERY_OPTIONS.forEach(name => {
    queryString.append(name, $(`[name=${name}]`).val());
  });
  const {origin, pathname} = window.location;
  return `${origin}${pathname}?${queryString.toString()}`;
}

// html2canvas returns a promise which returns a canvas that contains
// an image of our code, which we turned into a DOM tree of styled spans
// with hl.js. Then we want to use that canvas as a texture for the 3D plane
// in our webGL canvas, which the user actually sees.
function displayOnCanvas (texCanvas) {
  $('#content').hide();
  const texture = new CanvasTexture(texCanvas);
  planeMaterial.map = texture;
  texture.needsUpdate = true;
  if (!displayRunning) createWebGLDisplay();
  else createEffectComposer(composer, scene, cameraOrtho);
  $("#loading,#url-form,#error").hide();
  $("button[name=reset]").show();
  $("#permalink").html(`<a href="${generateQueryURL()}">Permalink to this codewall</a>`)
}

/* UI functions relating to various buttons and widgets */
function displayError (errMsg) {
  $("#error-msg").text(errMsg);
  $("#url-form,#loading,#content").hide();
  $("#error").show();
}

function reset () {
  $("button[name=reset]").hide();
  $("button[name=redraw]").show();
  $("#url-form").show();
}

function obj2InlineStyle (obj) {
  const styles = [];
  Object.keys(obj).forEach((key) => {
    styles.push(`${key}: ${obj.key};`);
  });
  return styles.join(' ');
}

// Get a file from github
// This is done in the least smart way imaginable, by just figuring out what
// the raw URL is, instead of using Github's API. So it's not guaranteed to
// work in the future, but it's good enough for a hack.
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

// Go back to the URL form if you want to retry.
$('#try-again').on('click', function tryAgain () {
  $('#error').hide();
  $('#url-form').show();
});

function tryURL (url) {
  $("#url-form").hide();
  $("#loading").show();
  currentURL = url;
  getUrl(url)
    .then(blob => {
      // We use pattern matching here because some browsers (Firefox) include
      // the encoding in the blob type, while others do not.
      if (!blob.type.match(/^text\/plain/))
        throw new Error(
          `This doesn't appear to be a text file. Expected text/plain, received
          ${blob.type}.`
        );
      const reader = new FileReader;
      reader.addEventListener("loadend", () => {
        currentText = reader.result;
        displayContent(reader.result);
      });
      reader.readAsText(blob);
    })
    .catch(displayError);
}

// Get an URL and read it.
$("#url-form").on("submit", (event) => {
  event.preventDefault();
  tryURL($("#url-form input").val());
});

const STYLE_CLASSES = "venturis weyland-yutani delos cyberdyne tyrell";

// How to respond to something changing in the style menu.
// I love callup
const optionActions = {
  styleSelect (val) {
    $("#content").removeClass(STYLE_CLASSES);
    $("#content").addClass(val);
  },

  aestheticSelect () {
    // NOOP
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

$("#style-menu select,#style-menu input").on("change",
  function respondToChange (event) {
    const {name, value} = event.target;
    optionActions[name](value);
    if (!displayRunning) return;
    $("button[name=redraw]").show();
});

// Redraw when requested by the user
// We don't do this automatically because it takes a long time and blocks the
// UI
// We could do it in a web worker but [shrug emoji]
function redraw () {
  $("#url-form").hide();
  $("#loading").show();
  $("button[name=redraw]").hide();
  // Hack to stop the UI from blocking before "loading" text shows up.
  window.setTimeout(() => {
    displayContent(currentText);
  }, 100);
}

$("button[name=reset]").on("click", reset);
$("button[name=redraw]").on("click", redraw);

// When the window gets resized, we have to resize our scene too.
window.onresize = function () {
  const {innerWidth: width, innerHeight: height} = window;
  const aspect = width / height;
  cameraOrtho.left   = - frustumSize * aspect / 2;
  cameraOrtho.right  =   frustumSize * aspect / 2;
  cameraOrtho.top    =   frustumSize / 2;
  cameraOrtho.bottom = - frustumSize / 2;
  cameraOrtho.updateProjectionMatrix();
  renderer.setSize(width, height);

  // Easier to generate a new plane and replace the old one than to worry about
  // scaling the same plane.
  scene.remove(plane);
  geometry = new PlaneGeometry( frustumSize * aspect, frustumSize, 16 );
  plane = new Mesh( geometry, planeMaterial );
  scene.add(plane);
  if (displayRunning) $("button[name=redraw]").show();
}

if (location.search !== "") {
  const query = new URLSearchParams(location.search);
  console.log(query);
  QUERY_OPTIONS.forEach(name => {
    $(`[name=${name}]`).val(query.get(name));
  });
  tryURL(query.get('url'));
}
