const loaderTemplate = (modules) => {
  return `!function(){var e=window.document,t=e.createElement.bind(e),n=e.body,a=e.head,i=function(e){if(e.length){var s=e.shift();if(s.match(/\\.css(\\?\\w+)?$/)){var d=t("link");d.href=s,d.type="text/css",d.rel="stylesheet",a.appendChild(d),i(e)}else{var r=t("script");r.type="text/javascript",r.src=s;r.onload=function(){i(e)};var q = t('div');q.appendChild(r);window.document.write(q.innerHTML);}}};i(${JSON.stringify(modules)})}();`;
};

export default loaderTemplate;
