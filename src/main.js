import $ from "jquery";
import hl from "highlight.js";
import html2canvas from 'html2canvas';
import {
  CanvasTexture, Scene, OrthographicCamera, WebGLRenderer, Mesh, Clock,
  PlaneGeometry, MeshLambertMaterial, HemisphereLight, PointLight, DoubleSide
} from 'three';
import {
  EffectComposer, GlitchPass, GlitchMode, RenderPass, BloomPass, FilmPass,
  KernelSize, PixelationPass, DotScreenPass
} from 'postprocessing';

let currentText;
let displayRunning;
let hideComments;

/* Create the Scene */
const canvas = document.getElementById('draw-canvas');
const renderer = new WebGLRenderer({ canvas });
const planeMaterial = new MeshLambertMaterial( {
  side: DoubleSide
} );
renderer.setSize(window.innerWidth, window.innerHeight);

const composer = new EffectComposer(renderer, {
  depthTexture: true,
});

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


/* UI Code */

function displayError (errMsg) {
  $("#error-msg").text(errMsg);
  $("#url-form,#loading,#content").hide();
  $("#error").show();
}


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

function createEffectComposer (composer, scene, camera) {
  composer.reset();
  composer.addPass(new RenderPass(scene, camera));
  EFFECT_STACKS[$("select[name=aestheticSelect]").val()](composer);
}

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


function displayOnCanvas (texCanvas) {
  $('#content').hide();
  const texture = new CanvasTexture(texCanvas);
  planeMaterial.map = texture;
  texture.needsUpdate = true;
  if (!displayRunning) createWebGLDisplay();
  else createEffectComposer(composer, scene, cameraOrtho);
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

  const aspect = window.innerWidth / window.innerHeight;
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
