let is_check_brower = true;
let is_mobile = '';
let image_type = 0;

const getValue = (k) => {
  return window.localStorage.getItem(k);
}
const setValue = (k, v) => {
  window.localStorage.setItem(k, v);
}

class Base64 {
  /**
   * 代码来自https://github.com/haochuan9421/base64-pro/
   */
   _lookup;
  _revLookup;
  _encodeChunkSize = 16383;
  constructor() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    this._lookup = [...alphabet].filter((char, i, arr) => arr.indexOf(char) === i && char.charCodeAt(0) < 128);
    this._revLookup = this._lookup.reduce(
      (map, char, i) => {
        map[char.charCodeAt(0)] = i;
        return map;
      },
      { 43: 62, 47: 63, 45: 62, 95: 63 }
    );
  }
  
  bufferToBase64(value, padding) {
    let arrayBuffer; // 底层的二进制数据
    let byteOffset; // 开始编码的位置
    let totalBytes; // 需要编码的字节总数
    if (ArrayBuffer.isView(value)) {
      arrayBuffer = value.buffer;
      byteOffset = value.byteOffset;
      totalBytes = value.byteLength;
    } else if (value instanceof ArrayBuffer) {
      arrayBuffer = value;
      byteOffset = 0;
      totalBytes = value.byteLength;
    } else {
      throw new Error("encode value can only be arrayBuffer or typedArray or dataView");
    }

    // 3个字节为一组进行处理，多出来的1个或2个字节最后单独处理
    const extraBytes = totalBytes % 3;
    const unit3Bytes = totalBytes - extraBytes;
    // 创建 Uint8Array 视图用于读取字节内容
    const view = new Uint8Array(arrayBuffer, byteOffset, totalBytes);

    // 字符串频繁拼接会比较慢，所以先分块保存，最后再一次性 join 成一个完整的字符串返回
    let chunks = [];
    for (let i = 0; i < unit3Bytes; i += this._encodeChunkSize) {
      let chunk = [];
      for (let j = i, chunkEnd = Math.min(unit3Bytes, i + this._encodeChunkSize); j < chunkEnd; j += 3) {
        // 把三个字节拼接成一个完整的 24 bit 数字
        const $24bitsNum = (view[j] << 16) | (view[j + 1] << 8) | view[j + 2];
        // 以 6 bit 为一个单元进行读取
        chunk.push(
          this._lookup[$24bitsNum >> 18] +
            this._lookup[($24bitsNum >> 12) & 0b111111] + // "& 0b111111" 是为了只保留最后面的6个字节
            this._lookup[($24bitsNum >> 6) & 0b111111] +
            this._lookup[$24bitsNum & 0b111111]
        );
      }
      chunks.push(chunk.join(""));
    }
    // 处理多出来的1个或2个字节
    if (extraBytes === 1) {
      const $8bitsNum = view[totalBytes - 1];
      chunks.push(this._lookup[$8bitsNum >> 2]);
      chunks.push(this._lookup[($8bitsNum << 4) & 0b111111]);
      padding && chunks.push("==");
    } else if (extraBytes === 2) {
      const $16bitsNum = (view[totalBytes - 2] << 8) | view[totalBytes - 1];
      chunks.push(this._lookup[$16bitsNum >> 10]);
      chunks.push(this._lookup[($16bitsNum >> 4) & 0b111111]);
      chunks.push(this._lookup[($16bitsNum << 2) & 0b111111]);
      padding && chunks.push("=");
    }

    return chunks.join("");
  }
  
  base64ToBuffer(base64Str) {
    if (typeof base64Str !== "string") {
      throw new Error("the first argument must be string");
    }
    // 去除尾部的 padding
    base64Str = base64Str.replace(/==?$/, "");
    
    // 4 个字符为一组进行处理，多出来的2个或3个字符最后单独处理
    let totalChars = base64Str.length;
    const extraChars = totalChars % 4;
    const unit4Chars = totalChars - extraChars;
    // 创建 arrayBuffer，每4个字符需要3个字节，如果最后多出来2个字符额外需要1个字节，如果最后多出来3个字符额外需要2个字节
    const arrayBuffer = new ArrayBuffer((unit4Chars / 4) * 3 + (extraChars === 0 ? 0 : extraChars - 1));
    // 创建 DataView 视图用于修改字节内容
    const view = new Uint8Array(arrayBuffer);

    let byteOffset = 0;
    for (let i = 0; i < unit4Chars; i += 4) {
      // 把4个字符对应的 code pointer 还原成3字节的数字
      const $24bitsNum =
        (this._revLookup[base64Str.charCodeAt(i)] << 18) |
        (this._revLookup[base64Str.charCodeAt(i + 1)] << 12) |
        (this._revLookup[base64Str.charCodeAt(i + 2)] << 6) |
        this._revLookup[base64Str.charCodeAt(i + 3)];

      // 以 8 bit 为一个单元修改 arrayBuffer 3次
      view[byteOffset++] = $24bitsNum >>> 16;
      view[byteOffset++] = ($24bitsNum >>> 8) & 0b11111111;
      view[byteOffset++] = $24bitsNum & 0b11111111;
    }
    
    // 处理多出来的2个或3个字符
    if (extraChars === 2) {
      const $8bitNum = (this._revLookup[base64Str.charCodeAt(totalChars - 2)] << 2) | (this._revLookup[base64Str.charCodeAt(totalChars - 1)] >>> 4);
      view[byteOffset++] = $8bitNum;
    } else if (extraChars === 3) {
      const $16bitNum =
        (this._revLookup[base64Str.charCodeAt(totalChars - 3)] << 10) |
        (this._revLookup[base64Str.charCodeAt(totalChars - 2)] << 4) |
        (this._revLookup[base64Str.charCodeAt(totalChars - 1)] >> 2);
      view[byteOffset++] = $16bitNum >>> 8;
      view[byteOffset++] = $16bitNum & 0b11111111;
    }
    return arrayBuffer;
  }
  
  encode(str) {
    const encoder = new TextEncoder();
    let buffer = encoder.encode(str);
    return this.bufferToBase64(buffer);
  }
  
  decode(str) {
    const decoder = new TextDecoder("utf-8");
    let buffer = this.base64ToBuffer(str)
    if (buffer === false) return false;
    return decoder.decode(buffer);
  }
}
let b64 = new Base64();

const gz_encode = function (s) {
  return b64.bufferToBase64(pako.gzip(s));
}
const gz_decode = function (s) {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(pako.ungzip(b64.base64ToBuffer(s)));
}

const gz64_encode = function (s) {
  const encoder = new TextEncoder();
  let buffer = encoder.encode(s);
  if (buffer.length > 140) {
    return gz_encode(s)
  }
  return b64.bufferToBase64(buffer);
}

const gz64_decode = function (s) {
  if (s.startsWith('H4sI')) {
    return gz_decode(s)
  }
  return b64.decode(s)
}

function makePic() {
  $('.loading').show();
  $('.phone-wrap').css('transform','scale(1.0)');
  $('.phone-wrap .iphone').removeClass('iphone-preview')

  html2canvas(
    $('.phone-wrap').get(0), 
    {},
  ).then(canvas => {
    let myImage = canvas.toDataURL("image/png");

    let pop_pic = $('.pop-pic');
    let pop_class = 'pc';
    if (browser.versions.mobile) {
      pop_class = 'mobile';
    }
    pop_pic.find('.tips').addClass(pop_class);
    pop_pic.find('img').attr('src', myImage);

    try {
      pop_pic.show();
    } catch (error) {}
    $('.phone-wrap').css('transform','');
    $('.phone-wrap .iphone').addClass('iphone-preview');
  });
  return false;
}

let browser = {
  versions:function(){ 
  let u = navigator.userAgent, app = navigator.appVersion; 
  return {//移动终端浏览器版本信息 
    trident: u.indexOf("Trident") > -1, //IE内核
    presto: u.indexOf("Presto") > -1, //opera内核
    webKit: u.indexOf("AppleWebKit") > -1, //苹果、谷歌内核
    gecko: u.indexOf("Gecko") > -1 && u.indexOf("KHTML") == -1, //火狐内核
    mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
    ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
    android: u.indexOf("Android") > -1 || u.indexOf("Linux") > -1, //android终端或者uc浏览器
    iPhone: u.indexOf("iPhone") > -1 , //是否为iPhone或者QQHD浏览器
    iPad: u.indexOf("iPad") > -1, //是否iPad
    webApp: u.indexOf("Safari") == -1 //是否web应该程序，没有头部与底部
    };
  }(),
  language:(navigator.browserLanguage || navigator.language).toLowerCase()
}


function getOs() { 
    let OsObject = ""; 
   if(isIE = navigator.userAgent.indexOf("MSIE")!=-1) { 
        return "MSIE"; 
   } 
   if(isFirefox=navigator.userAgent.indexOf("Firefox")!=-1){ 
        return "Firefox"; 
   } 
   if(isChrome=navigator.userAgent.indexOf("Chrome")!=-1){ 
        return "Chrome"; 
   } 
   if(isSafari=navigator.userAgent.indexOf("Safari")!=-1) { 
        return "Safari"; 
   }  
   if(isOpera=navigator.userAgent.indexOf("Opera")!=-1){ 
        return "Opera"; 
   } 
} 

function toDecimal2(x) {    
    let f = parseFloat(x);    
    if (isNaN(f)) {    
        return false;    
    }    
    f = Math.round(x*100)/100;    
    let s = f.toString();    
    let rs = s.indexOf('.');    
    if (rs < 0) {    
      rs = s.length;    
      s += '.';    
    }    
    while (s.length <= rs + 2) {    
      s += '0';    
    }    
    return s;    
}    

Number.prototype.formatMoney = function (places, symbol, thousand, decimal) {
    places = !isNaN(places = Math.abs(places)) ? places : 2;
    symbol = symbol !== undefined ? symbol : "$";
    thousand = thousand || ",";
    decimal = decimal || ".";
    let number = this,
        negative = number < 0 ? "-" : "",
        i = parseInt(number = Math.abs(+number || 0).toFixed(places), 10) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
    return symbol + negative + (j ? i.substr(0, j) + thousand : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousand) + (places ? decimal + Math.abs(number - i).toFixed(places).slice(2) : "");
};

$(function(){
  $('.go_make').click(function(){
    start_make1($(this));
  });
  $('#btn-menu').click(function () {
    $('.sidebar-nav').toggle();
  });
  
  // 初始化手机时间
  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();

  // qq表情
  function add_qq_emojis() {
    $('.faceBox').empty();
    $(qq_emoji).each((i, item) => {
      let a = '<a title="' + item + '" href="javascript:;"></a>';
      $('.faceBox').append(a);
    });
  }
  function add_wx_emojis() {
    $('.faceBox').empty();
    $(wx_emoji).each((i, item) => {
      let a = $(`<a title="${item}" href="javascript:;"></a>`);
      a.css({
        'background-image': 'url(../images/wechat-emoji-stickers.jpg)',
        'background-size': '900%',
        'background-position-x': -35 * (i % 7) - 5,
        'background-position-y': -31 * Math.floor(i / 7) - 5,
      });
      $('.faceBox').append(a);
    });
  }
  add_wx_emojis();

  // 点击显示表情事件
  $('body').on('click', '.btn-add-face', function () {
    let position = $(this).offset();
    let data_input = $(this).attr('data-input');
    $('#emojiPanel').show();
    $('#emojiPanel').css({
      // left:position.left,
      top: position.top + 85 - $('#emojiPanel').height()
    });
    $('#emojiPanel').attr('data-input', data_input);
    return false;
  });
  
  // 切换表情标签页
  $('body').on('click', '.faceTab a', function () {
    $('.faceTab .active').removeClass('active');
    $(this).addClass('active');
    let t = $(this).data('emoji');
    switch (t) {
      case 'qq_emoji':
        add_qq_emojis();
        break;
      case 'wx_emoji':
        add_wx_emojis();
        break;
    }
  })

  // 选择表情
  $('body').on('click', '.emojiArea a', function () {
    let t = $(this).attr('title');
    let emoji = $('.faceTab .active').data('emoji');
    if (emoji == 'qq_emoji') t = 'qq' + t;
    let data_input = $(this).parents('#emojiPanel').attr('data-input');
    insertAtCursor($('.' + data_input).get(0), '[' + t + ']');
    $('#emojiPanel').hide()
  });

  //初始时间
  for (let i = 0; i < 24; i++) {
    let h = i > 9 ? i : '0' + i;
    let s = h == hours ? ' selected' : '';
    $('.slt-hour,.slt-p-hour').append('<option' + s + '>' + h + '</option>');
  }
  for (let i = 0; i < 60; i++) {
    let h = i > 9 ? i : '0' + i;
    let s = h == minutes ? ' selected' : '';
    $('.slt-minite,.slt-p-minite').append('<option' + s + '>' + h + '</option>');
  }

  // 信号强度/运营商/网络信号
  $('.slt-common').change(function(){
    let val = $(this).find('option:selected').val();
    let _class = $(this).attr('data-class');
    $(this).find('option').each(function(i,item){
      $('.' + _class).removeClass($(item).val());
    });
    $('.' + _class).addClass(val);

    if (val == 'i-n-user-group') {
      $(".input-common").val("群聊标题(3)");
      $('.i-n-name span').text("群聊标题(3)");
    }
  });
    
  $('.rd-common').click(function(){
    let val = $(this).val();
    let _class = $(this).attr('data-class');
    if(val == '1'){
      $('.' + _class).show();
    }else{
      $('.' + _class).hide();
    }
  });
    // 是否可删除消息
    $('.rd-common1').click(function(){
      let val = $(this).val();
      if (val == '1') {
          $('.msg-del').css('display', 'none')
      } else {
          $('.msg-del').css('display', 'block')
      }
  })

  $('.input-common').change( function() {
    let _class = $(this).attr('data-class');
    let val = $.trim($(this).val());
    $('.' + _class).text(val);
    $('.' + _class).html(val);
  });

  // 手机时间选择
  $('.slt-phone-time').change(function(){
    let shi = $('.slt-p-shi option:selected').val();
    let hour = $('.slt-p-hour option:selected').val();
    let minite = $('.slt-p-minite option:selected').val();
    let str = '';

    if(shi != '-'){
      str += shi;
    }
    str += hour + ':';
    str += minite;

    $('.i-top-time').text(str);
  }).change();

  // 点击body事件
  $('body').click(function(e) {
    if (e.target.closest('#emojiPanel')) return;
    $('#emojiPanel').hide();
  });
  
  // 随机头像
  $('body').on('click', '.btn-rand-face', function () {
    let face_path = 'images/face/';
    let num = get_random_num(1,40);
    let file_name = face_path + num + '.jpg';
    let img = '<img src="' + file_name + '" />';
    $(this).parents('.add-user').find('.a-u-pic-show img').remove();
    $(this).parents('.add-user').find('.a-u-pic-show input').after(img);

    let _class = $(this).attr('data-class');
    if (_class) {
      let obj = $('.' + _class);
      if (_class == 'i-b-a-face_ali') {
        //支付宝转账
        $('.i-b-a-face_ali img').attr('src', file_name);
      } else {
        if (obj.get(0).tagName.toLowerCase() == 'img'){
          obj.attr('src',file_name);
        } else {
          obj.css('background-image','url(' + file_name + ')');
        }
      }
    }
  });

  $('body').on('click','.ali-btn-rand-face',function(){
      let face_path = '/images/face/';
      let num = get_random_num(1,40);
      let file_name = face_path + num + '.jpg';
      let img = '<img src="' + file_name + '" />';
      $(this).parents('.add-user').find('.a-u-pic-show img').remove();
      $(this).parents('.add-user').find('.a-u-pic-show input').after(img);

      let _class = $(this).attr('data-class');
      if(_class){
          let obj = $('.' + _class);
          if(_class=='i-b-a-face_ali'){
              //支付宝转账
              $('.i-b-a-face_ali img.changface').attr('src', file_name);
          } else{
              if(obj.get(0).tagName.toLowerCase() == 'img'){
                  obj.attr('src',file_name);
              }else{
                  obj.css('background-image','url(' + file_name + ')');
              }
          }
      }
  });

  // 随机用户名
  $('body').on('click','.btn-rand-username', function() {
    //let num = get_random_num(4,8);
    let name = randName();//randomString(num,true);
    $(this).parents('.add-user').find('.a-u-data-name').val(name);
  });

  //电池滑块
  function setBar(num){
    $('.i-top-berry i em').css('width',num + '%');
    num = num.toString();
    let index = num.toString().lastIndexOf('.');
    num = index == -1 ? num : num.substring(0,index);
    $('.i-top-berry-num').text(num + '%');
  }
  $('.slider_bar').sGlide({
    'startAt': 50,
    'width': 300,
    'height': 20,
    'unit': 'px',
    // 'image': 'img/knob_.png',
    // 'pill': false,
    'totalRange': [1,100],
    // 'locked': true,

    'colorShift': ['#3a4d31', '#7bb560'],
    // 'vertical': true,
    'buttons': true,
    // 'disabled': true,
    drag: function(o){
      setBar(o.custom);
    },
    onButton: function(o){
      setBar(o.custom);
    }
  });

  if(is_check_brower && (getOs() != 'Chrome' && getOs() != 'Safari')){
  //if(is_check_brower){
    let browser = '<div class="browser"><a target="_blank" href="http://www.12tool.com"><span>请勿在微信里面操作,直接复制网站地址到手机浏览器里面去操作!</span></a><a class="pop-close" href="#">x</a></div>';
    $('body').append(browser);
    $('body').append('<div class="mask"></div>');
    $('.mask').height($(document).height());
  }

  $('.pop-close').click(function(){
    $('.mask,.browser').hide();
    return false;
  });

  $('body').on('click', '.my-image-continue', function() {
    $('.mask, .my-image').hide();
    $('.phone-wrap').css('transform','');
    return false;
  });
  
  
  //消息数目
  let i_n_count = randomString(1);
  if (i_n_count > 0) {
    $('.input-i-n-count').val(i_n_count);
    $('.i-n-count').text(i_n_count);
  }
  $('.input-i-n-count').bind('input propertychange', function () {
    let val = $(this).val();
    if (isNaN(val) || val == 0) {
      $('.i-n-count').text('');
      return false;
    }
    val = $(this).val();
    $('.i-n-count').text(val);
  });
  $('.btn-del-i-n-count').click(function () {
    $('.i-n-count').text('');
    $('.input-i-n-count').val('');
    return false;
  });


  // 添加对话 
  function add_dialog(dialog) {
    let func = add_text_dialog;
    let args = [
      dialog.master,
      dialog.name,
      dialog.img,
      dialog.content,
    ]
    switch (dialog.type) {
      case 'text':
        func = add_text_dialog
        break;
      case 'voice':
        func = add_voice_dialog
        break;
      case 'sendpacket':
        func = add_sendpacket_dialog
        break;
      case 'receivepacket':
        func = add_receivepacket_dialog
        break;
      case 'pay':
        func = add_pay_dialog
        args.unshift(dialog.dir)
        break;
      case 'time':
        func = add_time_dialog
        args = [
          dialog.year, 
          dialog.month, 
          dialog.day, 
          dialog.week, 
          dialog.meridiem, 
          dialog.hour, 
          dialog.minite,
        ]
        break;
    }
    func(...args);
  }
  // 添加文字对话
  function add_text_dialog(master, name, img, content) {
    if (!name) {
      alert('请输入用户名！');
      return false;
    }
    if (!content) {
      alert('请输入聊天内容！');
      return false;
    }
    if (!img.length) {
      img = 'images/default-head.png';
    }

    content = replace_emojis(content);

    let msg_class = master ? 'i-b-sen-text' : 'i-b-rec-text';
    let nick = master ? '' : `<p class="i-b-nick">${name}</p>`;

    let dialog = $('<div class="' + msg_class + '"><div>' + nick + '<span><i></i><em>' + content + '</em><a class="msg-del"></a></span></div></div>');
    dialog.prepend(`<img src="${img}" />`);
    $('.i-body').append(dialog);
    // 显示名称
    $(".radio-i-b-nick:checked").click();
  }
  $('body').on('click', '.a-u-dialog a', function () {
    let user = $(this).parents('.add-user');
    let index = user.index();
    let name = user.find('.a-u-name .a-u-data-name').val();
    let content = user.find('.a-u-name textarea').val();
    let img = $(this).parent().parent().find('.a-u-pic-show img').attr('src');
    let master = user.find('.a-u-dialog-master a').hasClass('btn-success');

    add_text_dialog(master, name, img, content)
    dialogs.push({
      type: 'text',
      master: master,
      name: name,
      content: content,
      img: img,
    })
    return false;
  });

  // 添加时间
  function add_time_dialog(year, month, day, week, meridiem, hour, minite) {
    let str = '';
    if (year != '-')
      str += year + '年';
    if (month != '-')
      str += month + '月';
    if (day != '-')
      str += day + '日 ';
    if (week != '-')
      str += week + ' ';
    if (meridiem != '-')
      str += meridiem;
    str += hour + ':';
    str += minite;
    let html = '<div class="i-b-time"><span>' + str + '</span><a class="msg-del"></a></div>';
    $('.i-body').append(html);
  }
  $('.add-time-btn').click(function () {
    let year = $('.slt-year option:selected').val();
    let month = $('.slt-month option:selected').val();
    let day = $('.slt-day option:selected').val();
    let week = $('.slt-xinqi option:selected').val();
    let meridiem = $('.slt-shi option:selected').val();
    let hour = $('.slt-hour option:selected').val();
    let minite = $('.slt-minite option:selected').val();
    
    add_time_dialog(year, month, day, week, meridiem, hour, minite)
    dialogs.push({
      type: 'time',
      year, 
      month, 
      day, 
      week, 
      meridiem, 
      hour, 
      minite,
    })
    return false;
  });

  let set_body_bg = function () {
    let img = $('.a-u-pic-bodybg img');
    let src = img.attr('src');
    $('.i-body').css('background-image', 'url(' + src + ')');

  }


  $('body').on('change', '.a-u-pic-show input', function () {
    let img = document.createElement('img');//创建 img 对象
    let _this = $(this);
    let callback = _this.attr('data-callback');

    window.URL = window.URL || window.webkitURL;

    let imgFile = $(this).get(0);

    if (window.URL && imgFile.files[0]) {
      let reader = new FileReader();
      reader.readAsDataURL(imgFile.files[0]);
      reader.onload = function (e) {
        let img = '<img src="' + this.result + '" alt=""/>';
        _this.parent().find('img').remove();
        _this.parent().append(img);

        if (callback) {
          eval(callback + '()');
        }
      }
    }
  });

  // 图片对话上传图片
  $('body').on('change', '.a-u-pic-show-pic input', function () {
    let img = document.createElement('img');//创建 img 对象
    let _this = $(this);
    let callback = _this.attr('data-callback');

    window.URL = window.URL || window.webkitURL;

    let imgFile = $(this).get(0);

    if (window.URL && imgFile.files[0]) {
      let reader = new FileReader();
      reader.readAsDataURL(imgFile.files[0]);
      reader.onload = function (e) {
        let img = '<img src="' + this.result + '" alt=""/>';
        //console.log($(img));console.log($($(img)[0]));console.log($($(img)[0]).width());alert($(img)[0].width+"==bbb");
        let img1 = document.createElement('img');//创建 img 对象
        $(img1).attr("src", this.result).load(function () {
          $(img1).attr("data-width", this.width).attr("data-height", this.height);
          _this.parent().find('img').remove();
          _this.parent().append(img1);
        });
        //_this.parent().find('img').remove();
        //_this.parent().append(img);

        if (callback) {
          eval(callback + '()');
        }
      }
    }
  });

  // 添加图片对话
  let pic_i = 0;
  $('body').on('click', '.a-u-dialog-pic a', function () {
    $('.i-body').css('background', 'none');
    let user = $(this).parents('.add-user');
    let name = user.find('.a-u-name .a-u-data-name').val();
    let img = $(this).parent().parent().find('.a-u-pic-show img').clone();
    let pic = $(this).parent().parent().find('.a-u-pic-show-pic img').clone();
    let type = user.find('.a-u-dialog-master a').hasClass('btn-success');
    pic_i = pic_i + 1;
    if (name == '') {
      alert('请输入用户名！');
      return false;
    }

    if (!pic.length) {
      alert('您没有上传图片！');
      return false;
    }

    if (!img.length) {
      img = '<img src="/Public/Home/images/face/default-head.png" />';
    }

    let wrap_class = !type ? 'i-b-rec-text' : 'i-b-sen-text';
    let nick = type ? '' : '<p class="i-b-nick">' + name + '</p>';
    let pic_type = !type ? 'wx_pic_pos2' : 'wx_pic_pos';

    let unread = '';//type ? '' : '<strong></strong>';

    let span_height = pic.attr('data-height') / (pic.attr('data-width') / 209);

    let html = $('<div class="' + wrap_class + '"><div class="i-b-voice">' + nick + '<span class="wx_pic_diy" id="s' + pic_i + '" style="height:' + span_height + 'px"><h6 class="' + pic_type + '"></h6><a class="msg-del"></a></span></div></div>');

    html.prepend(img);

    $('.i-body').append(html);

    $('#s' + pic_i).prepend(pic);


    return false;
  });

  // 添加用户
  $('#add-user').click(function () {
    let time = (new Date()).valueOf();
    let html = $('<div class="add-user"><div class="a-u-pic"><div class="a-u-pic-show"><input type="file" accept="image/jpeg,image/x-png" /></div></div><div class="a-u-name"><p><span>用户名：</span><input class="a-u-data-name" type="text" value="" /></p><p><span>聊天内容：</span><textarea class="a-u-content' + time + '"></textarea><a class="a-u-face btn-add-face" data-input="a-u-content' + time + '" href="#">表情</a></p><p><span>红包祝福语：</span><input class="a-u-data-redpacket" type="text" value="恭喜发财，大吉大利！"></p><p><span>转账/收钱金额：</span><input class="a-u-data-pay" type="text" value="" /></p><p><span>语音时间：</span><input class="a-u-data-voice" type="text" value="" /></p><p><input style="margin-right:5px;" class="btn-rand-username" type="button" value="随机用户名" /><input class="btn-rand-face" type="button" value="随机头像" /></p><p><div class="a-u-pic-pic"><div class="a-u-pic-show-pic"><input type="file" class="a-u-data-pic" accept="image/jpeg,image/x-png"></div></div></p></div><div class="a-u-dialog" style="clear:both;"><a class="btn btn-primary" data-type="left" href="#">添加文字对话</a></div><div class="a-u-dialog-pic"><a class="btn btn-warning" data-type="left" href="#">添加图片对话</a></div><div class="a-u-dialog-voice"><a class="btn btn-primary" data-type="left" href="#">添加语音对话</a></div><div class="a-u-dialog-sedpacket"><a class="btn btn-danger" data-type="left" href="#">添加发红包对话</a></div><div class="a-u-dialog-redpacket"><a class="btn btn-danger" data-type="left" href="#">添加收红包对话</a></div><div class="a-u-dialog-pay"><a class="btn btn-primary" data-dir="send" data-type="left" href="#">添加转账对话</a></div><div class="a-u-dialog-pay"><a class="btn btn-primary" data-dir="rec" data-type="left" href="#">添加收钱对话</a></div><div class="a-u-dialog-master"><a class="btn btn-primary" href="#">设为主人</a></div><div class="a-u-dialog-del"><a class="btn btn-danger" href="#">删除用户</a></div></div>');
    $('.users').append(html);
    html.find('.btn-rand-username').click();
  });

  // 删除用户
  $('body').on('click', '.a-u-dialog-del', function () {
    if (confirm('您确认要删除？')) {
      $(this).parents('.add-user').remove();
    }
    return false;
  });

  /*$('body').on('mouseover','.i-b-time,.i-b-rec-text,.i-b-sen-text',function(){
  $(this).find('.msg-del').show();
  });
  $('body').on('mouseout','.i-b-time,.i-b-rec-text,.i-b-sen-text',function(){
  $(this).find('.msg-del').hide();
  });*/


  // 删除对话
  $('body').on('click', '.msg-del', function () {
    $(this).parents('.i-b-time, .i-b-rec-text, .i-b-sen-text').remove();
  });

  // 清除所有对话
  $('.clear-dialog').click(function () {
    if (confirm('您确认要清除所有对话？')) {
      $('.i-b-time, .i-b-rec-text, .i-b-sen-text').remove();
      dialogs = [];
    }
  });

  // 添加发红包对话
  function add_sendpacket_dialog(master, name, img, content) {
    if (!name) {
      alert('请输入用户名！');
      return false;
    }
    if (!content) {
      content = '恭喜发财，大吉大利！';
    }
    if (!img) {
      img = 'images/default-head.png';
    }

    let wrap_class = !master ? 'i-b-rec-text' : 'i-b-sen-text';
    let nick = master ? '' : '<p class="i-b-nick">' + name + '</p>';

    let html = $('<div class="' + wrap_class + '"><div class="redpacket">' + nick + '<div class="content"><i class="arraw"><b></b></i><div class="main clear-div"><i class="icon"></i><h3>' + content + '</h3></div><div class="clear-div foot"><h3>微信红包</h3></div><a class="msg-del"></a></div></div></div>');
    html.prepend(`<img src="${img}" />`);
    $('.i-body').append(html);

  }
  $('body').on('click', '.a-u-dialog-sedpacket a', function () {
    let user = $(this).parents('.add-user');
    let master = user.find('.a-u-dialog-master a').hasClass('btn-success');
    let index = user.index();
    let name = user.find('.a-u-name .a-u-data-name').val();
    let content = user.find('.a-u-name .a-u-data-redpacket').val();
    let img = $(this).parent().parent().find('.a-u-pic-show img').clone();

    add_sendpacket_dialog(master, name, img, content)
    dialogs.push({
      type: 'sendpacket',
      master: master,
      name: name,
      content: content,
      img: img,
    })
    return false;
  });

  // 添加收红包对话
  function add_receivepacket_dialog(master, name, img, content) {
    let word = !master ? name + '领取了你的' : '你领取了' + name + '的';
    let nick = master ? '' : '<p class="i-b-nick">' + name + '</p>';

    // let html = $('<div class="' + wrap_class + '"><div class="redpacket">' + nick + '<div class="content"><i class="arraw"><b></b></i><div class="main clear-div"><i class="icon"></i><h3>' + redpacket + '</h3><h4>领取红包</h4></div><div class="clear-div foot"><h3>微信红包</h3></div><a class="msg-del"></a></div></div></div>');
    let html = $('<div class="i-b-time"><span><img src="./images/a-redpacket-icon.png" class="icon_redpacket"> ' + word + '<a class="orange">红包</a></span><a class="msg-del"></a></div>');
    $('.i-body').append(html);
  }
  $('body').on('click', '.a-u-dialog-redpacket a', function () {
    let user = $(this).parents('.add-user');
    let master = user.find('.a-u-dialog-master a').hasClass('btn-success');
    let name = user.find('.a-u-name .a-u-data-name').val();
    let user_num = $(this).parents().parents().find('.add-user').length;
    if (master) {
      $(this).parents().parents().find('.add-user').each(function (index, element) {
        if ($(this).find('.a-u-dialog-master a').hasClass('btn-success')) {
          indexs = index;
          return false;
        }
      });
      let rand = get_random_num(0, user_num - 1);
      if (rand == indexs) {
        rand = (rand < (user_num - 1)) ? rand + 1 : rand - 1;
      }
      name = $($(this).parents().parents().find('.add-user')[rand]).find('.a-u-name .a-u-data-name').val();
    }
    
    add_receivepacket_dialog(master, name)
    dialogs.push({
      type: 'receivepacket',
      master: master,
      name: name,
      content: '',
      img: '',
    })
    return false;
  });

  // 添加转账对话
  function add_pay_dialog(dir, master, name, img, money) {
    if (dir !== 'send' && dir !== 'receive') {
      alert('pay类型错误！');
      return false;
    }
    if (!name) {
      alert('请输入用户名！');
      return false;
    }
    if (!money) {
      alert('请输入转账/收钱金额！');
      return false;
    }
    if (isNaN(money)) {
      alert('您输入的金额有误！');
      return false;
    }
    if (!img) {
      img = 'images/default-head.png';
    }

    let wrap_class = !master ? 'i-b-rec-text' : 'i-b-sen-text';
    let pay_class = dir == 'send' ? 'i-pay-send' : 'i-pay-rec';
    let nick = master ? '' : '<p class="i-b-nick">' + name + '</p>';

    let html = $('<div class="' + wrap_class + '"><div class="i-b-pay">' + nick + '<span class="' + pay_class + '"><i></i><em>' + toDecimal2(money) + '</em><a class="msg-del"></a></span></div></div>');
    html.prepend(`<img src="${img}" />`);
    $('.i-body').append(html);
    //显示名称
    $(".radio-i-b-nick:checked").click();
  }
  $('body').on('click', '.a-u-dialog-pay a', function () {
    let dir = $(this).attr('data-dir');
    let user = $(this).parents('.add-user');
    let master = user.find('.a-u-dialog-master a').hasClass('btn-success');
    let index = user.index();
    let name = user.find('.a-u-name .a-u-data-name').val();
    let money = user.find('.a-u-name .a-u-data-pay').val();
    let img = $(this).parent().parent().find('.a-u-pic-show img').attr('src');
    
    add_pay_dialog(dir, master, name, img, money);
    dialogs.push({
      type: 'pay',
      dir: dir,
      master: master,
      name: name,
      img: img,
      content: money,
    })
    return false;
  });

  // 添加语音对话
  function add_voice_dialog(master, name, img, voice_length) {
    if (!name) {
      alert('请输入用户名！');
      return false;
    }
    if (!voice) {
      alert('请输入语音时间！');
      return false;
    }
    if (isNaN(voice_length)) {
      alert('您输入的语音时间有误！');
      return false;
    }
    if (!img) {
      img = 'images/default-head.png';
    }

    let wrap_class = !type ? 'i-b-rec-text' : 'i-b-sen-text';
    let nick = type ? '' : '<p class="i-b-nick">' + name + '</p>';

    let v_len = 0;
    let len = 0;
    v_len = voice > 60 ? 60 : voice;
    len = (360 - 96) / 60 * v_len + 96;
    let unread = '';//type ? '' : '<strong></strong>';

    let html = $('<div class="' + wrap_class + '"><div class="i-b-voice">' + nick + '<span style="width:' + len + 'px"><i></i><b></b><em>' + voice + '\'\'</em>' + unread + '<a class="msg-del"></a></span></div></div>');

    html.prepend(`<img src="${img}" />`);
    $('.i-body').append(html);
    // 显示名称
    $(".radio-i-b-nick:checked").click();
  }
  $('body').on('click', '.a-u-dialog-voice a', function () {
    let user = $(this).parents('.add-user');
    let name = user.find('.a-u-name .a-u-data-name').val();
    let img = $(this).parent().parent().find('.a-u-pic-show img').clone();
    let voice = user.find('.a-u-name .a-u-data-voice').val();
    let master = user.find('.a-u-dialog-master a').hasClass('btn-success');

    add_voice_dialog(master, name, img, voice)
    dialogs.push({
      type: 'voice',
      master: master,
      name: name,
      img: img,
      content: voice,
    })
    return false;
  });

  // 主人切换
  $('body').on('click', '.a-u-dialog-master a', function () {
    let parent = $(this).parents('.users');
    parent.find('.a-u-dialog-master a').removeClass('btn-success');
    $(this).addClass('btn-success');
    return false;
  });

  // 背景删除
  $('.body_bg_del').click(function () {
    $('.i-body').css('background-image', 'none');
    $('.a-u-pic-bodybg img').remove();
    return false;
  });

  const searchParams = new URLSearchParams(window.location.search);
  let dialogs = searchParams.get('dialogs');
  if (dialogs) {
    try {
      dialogs = JSON.parse(gz64_decode(dialogs));
      console.log(dialogs)
      for (const dialog of dialogs) {
        add_dialog(dialog);
      }
      
      $('.add-user').find('.a-u-pic-show img').remove();
      $('.add-user').find('.a-u-pic-show input').after('<img src="' + dialogs[0].img + '" />');
      $('.add-user').find('.a-u-data-name').val(dialogs[0].name);
    } catch (e) {
      console.error(e)
      dialogs = ''
    }
  } 
  if (!dialogs) {
    dialogs = [];
    $('#add-user').click();
    setTimeout(function () {
      $('.btn-rand-face').click();
      $('.btn-rand-username').click();
    
      let _title = '';
      $(".a-u-data-name").each(function () {
        _title = $(this).val();
      });
    
      /*$('.input-common').val(_title);
      $('.i-n-name span').text(_title);*/
      add_dialog({
        type: 'time',
        year: '-', 
        month: '-', 
        day: '-', 
        week: '昨天', 
        meridiem: '-', 
        hour: '08', 
        minite: '33',
      })
      add_dialog({
        type: 'text',
        master: false,
        name: '冷夕颜',
        img: 'picture/33.jpg',
        content: '这个是示例对话哦，先点击对话设置里的“清除对话”按钮，然后添加你要的对话类型就行了，需要多个用户进行对话请点击“添加用户”按钮即可[愉快]',
      })
      add_dialog({
        type: 'sendpacket',
        master: true,
        name: '微信对话制作',
        img: 'picture/14.jpg',
        content: '',
      })
      add_dialog({
        type: 'receivepacket',
        master: false,
        name: '冷夕颜',
        img: '',
        content: '',
      })
      add_dialog({
        type: 'pay',
        dir: 'send',
        master: true,
        name: '微信对话制作',
        img: 'picture/14.jpg',
        content: 88.88,
      })
      add_dialog({
        type: 'pay',
        dir: 'receive',
        master: false,
        name: '冷夕颜',
        img: 'picture/33.jpg',
        content: 88.88,
      })
    }, 10);
  }
  
  function sava_dialogs() {
    let params = new URLSearchParams(window.location.search);
    params.set('dialogs', gz64_encode(JSON.stringify(dialogs)));
    history.replaceState({}, '', '?' + params.toString());
  }
  
  
  $('.pop-pic .tips a').click(function () {
    $('.pop-pic').hide();
    $('#wrapper').show();
  });

  $('#save').click(() => {
    makePic();
  });

  /*背景选择ss*/
  $(".btn-bgModal").click(function () {
    let _arr = ['images/bg/12.jpeg', 'images/bg/13.jpeg', 'images/bg/11.jpeg', 'images/bg/10.jpeg', 'images/bg/9.jpeg', 'images/bg/8.jpeg', 'images/bg/7.jpeg', 'images/bg/6.jpeg', 'images/bg/5.jpeg', 'images/bg/4.jpeg', 'images/bg/2.jpeg', 'images/bg/3.jpeg', 'images/bg/1.png', 'images/bg/1.jpeg'];
    let _html = '<ul>';
    for (let i in _arr) {
      _html += '<li><a href="javascript:void(0);"><img src="picture/56b76067c0444761b633389802e7c352.gif' + _arr[i] + '" ></a></li>';
    }
    _html += '</ul>';
    //选择背景
    _html = $(_html)
    _html.find('img').click(function () {
      let src = $(this).attr('src');
      $('.a-u-pic-bodybg img').attr("src", src);
      $('.i-body').css('background-image', "url('images / 4f3daeac1d0d495191cbecdc3ca9b5b2.gif')");

    });
    $("#bglist").html(_html);
  });
});