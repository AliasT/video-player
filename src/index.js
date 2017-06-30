// 有空就替换一下moment自己处理了
// 简单封装，没有解决内联播放
// 问题的关键不在于controls属性
// 状态控制行为
import './index.scss'
import moment from 'moment'
import play from './play.svg'
import pause from './pause.svg'
import fullscreen from './fullscreen.svg'


function setAttributes(target, props) {
  Object.keys(props).reduce((ret, cur) => {
    target.setAttribute(cur, props[cur])
    return ret
  }, target)
}

function setStyle(target, props) {
  Object.keys(props).reduce((ret, cur) => {
    target.style[cur] = props[cur]
    return ret
  }, target)
}

function addChild(target, ...children) {
  children.forEach(function (child, i) {
    target.appendChild(child)
  })
}

function fix(num) {
  return num < 10 ? '0' + num : num
}


// 网站自定义的video
export default class VVideo {
  static MAX_TIME = 30

  isplaying = false
  ispreviewEnded = false
  userPlay = true
  userDragging = false

  constructor(container, options) {
    this.container = container
    this.options = options

    this.setupWrapper()
    this.setupControls()
    this.setupTime()
    this.setupVideo()
    this.setupSlider()
    this.setupListeners()
    this.update()
  }

  setupControls() {
    this.playButton = document.createElement('img')
    this.playButton.src = play
    this.playButton.className = 'video-play-control'

    addChild(this.wrapper, this.playButton)

    this.pauseButton = document.createElement('img')
    this.pauseButton.src = pause
    this.pauseButton.className = 'video-pause-control'


    this.timeStatus = document.createElement('div')
    this.timeStatus.className = 'video-status'

    this.fullScreenButton = document.createElement('img')
    this.fullScreenButton.src = fullscreen


    addChild(this.controls,  this.pauseButton, this.timeStatus, this.fullScreenButton)

    this.playButton.addEventListener('click', () => {
      this.userPlay = true
      // ios中第一次手动触发play方法无效
      this.controlsVisible = 1
      this.playButtonVisible = 0
      this.isplaying = true
      this.video.play()
    })


    this.pauseButton.addEventListener('click', () => {
      this.controlsVisible = 0
      this.playButtonVisible = 1
      this.isplaying = false
      this.video.pause()
    })

    this.fullScreenButton.addEventListener('click', () => {
      if(this.video.requestFullscreen) this.video.requestFullscreen()
      else if(this.video.webkitEnterFullScreen) this.video.webkitEnterFullScreen()  // ios 11
      else if(this.video.webkitRequestFullscreen) this.video.webkitRequestFullscreen()
    })
  }

  setupTime() {
    this.startTime = document.createElement('span')
    this.endTime = document.createElement('span')

    this.startTime.className = 'time'
    this.endTime.className = 'time'

    this.total = document.createElement('div')
    this.total.className = 'total-time'

    this.current = document.createElement('span')
    this.current.className = 'current-time'

    // 圆形拖动按钮
    this.slider = document.createElement('i')
    this.slider.className = 'time-slider'

    addChild(this.timeStatus, this.startTime, this.total, this.endTime)
    addChild(this.total, this.current, this.slider)


    // 时间选取
    this.total.addEventListener('click', (evt) => {
      this.controlsVisible = 1
      const current = ((evt.pageX || evt.touches[0].pageX) - this.rect.left) / this.rect.width * this.timeTo
      this.timeFrom = current
    })
  }

  setupSlider() {
    this.slider.addEventListener('touchstart', (evt) => {
      this.startX = evt.touches[0].pageX
      this.startTimeFrom = this.timeFrom
    })

    // 拖动选择时间
    this.slider.addEventListener('touchmove', (evt) => {
      this.controlsVisible = 1
      const delta = (evt.touches[0].pageX - this.startX) / this.rect.width * this.timeTo
      this.timeFrom = this.startTimeFrom + delta
    })

    // this.slider.addEventListener('touchend', () => {} )
  }

  select() {

  }

  setupWrapper() {
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'video-wrapper'

    this.controls = document.createElement('div')
    this.controls.className = 'video-controls'
    this.controlsVisible = 0
    this.container.appendChild(this.wrapper)

    addChild(this.wrapper, this.controls)
  }

  set playButtonVisible (value) {
    this.playButton.style.opacity = value
  }

  get playButtonVisible () {
    return this.playButton.style.opacity
  }

  get controlsVisible () {
    return this.controls.style.opacity
  }

  set controlsVisible (value) {
    this.controls.style.opacity = value
    if(value == 1) {
      setTimeout(() => {
        this.controls.style.opacity = 0
      }, 6000)
    }
  }

  update = () => {
    requestAnimationFrame(this.update)
    // if(!this.userPlay) {
    //   if(this.isplaying) {
    //     this.video.play()
    //   } else {
    //     this.video.pause()
    //   }
    // }
    this.video.removeAttribute('controls')
    this.video.controls = false
    // 暂不考虑使用图标
    this.startTime.innerHTML = this._timeFrom

    this.current.style.right = this.right + 'px'
    this.slider.style.left = this.left - 10 + 'px'
  }

  get rect() {
    return this.total.getBoundingClientRect()
  }

  get right() {
    return (1 - this.timeFrom / this.timeTo) * this.rect.width
  }

  get left() {
    return this.timeFrom / this.timeTo * this.rect.width
  }

  static computeTime(duration) {
    // 不可能超过天吧，我的天
    const d = moment.duration(duration, 'seconds')
    let result = `${fix(d.minutes())}:${fix(d.seconds())}`

    if(d.hours()) {
      return fix(d.hours()) + ':' + result
    } else {
      return result
    }
  }

  get _timeFrom () {
    return VVideo.computeTime(this.timeFrom)
  }

  get _timeTo () {
    return VVideo.computeTime(this.timeTo)
  }

  screenchange = e => {
    alert(e)
    this.video.pause()
    this.video.play()
    // ios 上暂时误解 
    if('isFullscreen' in document && !document.isFullscreen) {
      this.video.pause()
      this.video.controls = false
      this.video.removeAttribute('controls')
    } else if('webkitIsFullScreen' in document && !document.webkitIsFullScreen) {
      this.video.pause()
      this.video.removeAttribute('controls')
    }
  }

  setupVideo() {
    const { src, poster } = this.options
    this.video = document.createElement('video')
    this.wrapper.appendChild(this.video)

    this.video.className = 'video'
    this.video.onfullscreenchange = this.screenchange
    // this.video.addEventListener('click', (e) => {
    //   if(this.playButtonVisible == 0) {
    //     this.controlsVisible = 1
    //   }
    // })
    setAttributes(this.video, {
      // poster,
      src,
      'webkit-playsinline': true,
      'playsinline': true,
      'preload': 'metadata',
      'crossorigin': true,
      // 'controls': 'controls',
    })
    this.video.controls = false
  }

  setupListeners() {
    this.video.ontimeupdate = this.ontimeupdate
    this.video.onloadedmetadata = this.onloadedmetadata
    this.video.onpause = this.onpause
  }


  get timeFrom() {
    return this.video.currentTime
  }

  set timeFrom(value) {
    this.video.currentTime = value
  }

  get timeTo() {
    return this.video.duration
  }

  ontimeupdate = (evt) => {
    const { ontimeupdate, maxTime=VVideo.MAX_TIME } = this.options
    if(this.video.currentTime >= maxTime) {
      // 停止播放，触发预览结束事件
      this.userPlay = false
      this.isplaying = false
      this.video.pause()
      this.onpreviewended({})
    }
  }

  onloadedmetadata = (evt) => {
    // 设置currentTime=0可以让没有封面的视频显示第一帧
    // evt.target.currentTime = 0
    this.timeFrom = 0
    this.endTime.innerHTML = this._timeTo
  }

  onpause = e =>  {
    this.controlsVisible = 0
    this.playButtonVisible = 1
    this.video.controls = false
    this.video.removeAttribute('controls')
    if(this.timeFrom >= this.timeTo) {
      this.video.webkitExitFullscreen()
    }
  }

  onpreviewended = (evt) => {

  }
}
