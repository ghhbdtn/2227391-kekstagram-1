import {isEscKey} from './util.js';
import {effects, styleForFilter} from './photo-effects.js';
import {sendFormAsync} from './network.js';

const uploadImage = document.querySelector('#upload-file');
const editor = document.querySelector('.img-upload__overlay');
const closeButton = document.querySelector('#upload-cancel');
const form = document.querySelector('.img-upload__form');
const hashtag = form.querySelector('.text__hashtags');
const comment = form.querySelector('.text__description');
const submitButton = form.querySelector('.img-upload__submit');

const scaleControlSmaller = document.querySelector('.scale__control--smaller');
const scaleControlBigger = document.querySelector('.scale__control--bigger');
const scaleControlValue = document.querySelector('.scale__control--value');
const imagePreview = document.querySelector('.img-upload__preview');
const sliderElement = document.querySelector('.effect-level__slider');
const effectLevelValue = document.querySelector('.effect-level__value');
const effectLevel = document.querySelector('.img-upload__effect-level');

const errorTemplate = document.querySelector('#error');
const successTemplate = document.querySelector('#success');

const event = new Event('change');

let currentEffectClass = 'effects__preview--none';
let currentEffectInfo = effects['marvin'];

const pristine = new Pristine(form, {
  classTo: 'img-upload__field-wrapper',
  errorTextParent: 'img-upload__field-wrapper',
  errorTextClass: 'text-invalid__error'
}, true);

export const closeEditor = () => {
  uploadImage.value = '';
  form.reset();
  submitButton.disabled = false;
  hashtag.value = '';
  comment.value = '';
  editor.classList.add('hidden');
  currentEffectClass = 'effects__preview--none';
  document.body.classList.remove('modal-open');
  sliderElement.classList.add('hidden');
  effectLevel.classList.add('hidden');
  hashtag.dispatchEvent(event);
};

const onEscKeydown = (evt) => {
  if (isEscKey(evt.key) && evt.target !== hashtag && evt.target !== comment) {
    closeEditor();
  }
};

uploadImage.addEventListener('change', () => {
  document.addEventListener('keydown', onEscKeydown);
  closeButton.addEventListener('click', closeEditor, {once: true});

  document.body.classList.add('modal-open');
  editor.classList.remove('hidden');

  submitButton.disabled = false;
  scaleControlValue.value = '100%';
  imagePreview.style.transform = 'scale(1)';
  imagePreview.style.filter = 'none';

});

//Наложение фильтров


noUiSlider.create(
  sliderElement, {
    range: {
      min: 0,
      max: 100,
    },
    start: 10,
    connect: 'lower'
  }
);

sliderElement.noUiSlider.on('update', () => {
  const value = sliderElement.noUiSlider.get();
  const filterInfo = currentEffectInfo.filterInfo;
  imagePreview.style.filter = styleForFilter(filterInfo, value);
  effectLevelValue.value = value.toString();
});

form.addEventListener('change', (evt) => {
  if (!evt.target.matches('input[type="radio"]')) {
    return;
  }
  const newEffect = evt.target.value;
  changeEffectClass(newEffect);
  if (newEffect === 'none') {

    imagePreview.style.filter = 'none';
    effectLevel.classList.add('hidden');
    sliderElement.classList.add('hidden');

  }else {

    currentEffectInfo = effects[newEffect];
    sliderElement.noUiSlider.updateOptions(effects[newEffect].sliderOptions);
    if (effectLevel.classList.contains('hidden') ){
      effectLevel.classList.remove('hidden');}
    if (sliderElement.classList.contains('hidden')) {
      sliderElement.classList.remove('hidden');
    }
  }
});

function changeEffectClass(newEffectName) {
  const newEffectClass = `effects__preview--${newEffectName}`;
  imagePreview.classList.remove(currentEffectClass);
  imagePreview.classList.add(newEffectClass);
  currentEffectClass = newEffectClass;
}

//Масштаб изображения
scaleControlSmaller.addEventListener(
  'click',
  () => {
    const newValue = Math.max(parseInt(scaleControlValue.value, 10) - 25, 25);
    scaleControlValue.value = `${newValue}%`;
    imagePreview.style.transform = `scale(${newValue / 100})`;
  }
);

scaleControlBigger.addEventListener(
  'click',
  () => {
    const newValue = Math.min(parseInt(scaleControlValue.value, 10) + 25, 100);
    scaleControlValue.value = `${newValue}%`;
    imagePreview.style.transform = `scale(${newValue / 100})`;
  }
);

//Валидация текстовых полей
let isHashtagChecked = true;
let isCommentChecked = true;
const regex = /(^\s*$)|(^#[A-zА-яЁё0-9]{1,19}$)/;

const isCorrectHashtag = (value) => regex.test(value);


const setSubmitButton = () => {
  submitButton.disabled = !isHashtagChecked || !isCommentChecked;
};

hashtag.addEventListener('change', () => { submitButton.disabled = !pristine.validate();});

const validateHashtag = (value) => {
  const hashtags = value.split(' ');
  const setOfHashtags = new Set();
  hashtags.forEach((tag) => {
    setOfHashtags.add(tag.toLowerCase());
  });
  isHashtagChecked = hashtags.every(isCorrectHashtag) && hashtags.length <6 && hashtags.length === setOfHashtags.size;
  setSubmitButton();
  return isHashtagChecked;
};

const validateComment = (value) => {
  isCommentChecked = value.length < 140;
  setSubmitButton();
  return isCommentChecked;
};

pristine.addValidator(
  hashtag,
  validateHashtag,
  'Неверный формат хэштега'
);

pristine.addValidator(
  comment,
  validateComment,
  'Допустимая длина комментария - 140 символов'
);

const successFunc = () => {
  const successCopy = successTemplate.cloneNode(true).content.querySelector('.success');

  successCopy.addEventListener(
    'click',
    (evt) => {
      if (evt.target.className !== 'success__inner' && evt.target.className !== 'success__title') {
        document.body.removeChild(successCopy);
        closeEditor();
      }
    });
  document.body.appendChild(successCopy);
};

const errorFunc = (message) => {
  const errorCopy = errorTemplate.cloneNode(true).content.querySelector('.error');
  errorCopy.querySelector('.error__title').textContent = message;
  errorCopy.classList.remove('hidden');
  errorCopy.addEventListener(
    'click',
    (evt) => {
      if (evt.target.className !== 'error__inner' && evt.target.className !== 'error__title') {
        errorCopy.classList.add('hidden');
        document.body.removeChild(errorCopy);
      }
    });
  document.body.appendChild(errorCopy);
};

document.addEventListener('keydown', (evt) => {
  if (isEscKey(evt.key)) {
    const errorBlock = document.body.querySelector('.error');
    const errorCopy = errorTemplate.cloneNode(true);
    const successBlock = document.body.querySelector('.success');
    if (errorBlock) { document.body.removeChild(errorBlock);errorCopy.classList.add('hidden'); }
    else if (successBlock) { document.body.removeChild(successBlock); closeEditor(); }
    else if (
      document.activeElement.className !== 'text__hashtags' &&
      document.activeElement.tagName !== 'TEXTAREA'
    ) {
      closeEditor();
    }
  }
});

submitButton.addEventListener('click', (evt) => {
  submitButton.disabled = true;
  evt.preventDefault();
  sendFormAsync(new FormData(form), successFunc, errorFunc);
});
