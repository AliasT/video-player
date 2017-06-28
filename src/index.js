// 有空就替换一下moment自己处理了
// 简单封装，没有解决内联播放
import moment from 'moment'

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
  return num <= 10 ? '0' + num : num
}

const cssRules = `
  .video-wrapper {
    width: 100%;
    position: relative;
    font-size: 14px;
  }

  .video-wrapper .video {
    object-fit: null;
    width: 100%;
  }
  
  .video-controls {
    width: 100%;
    display: flex;
    position: absolute;
    z-index: 100;
    bottom: 0;
    left: 0;
    width: 100%;
    background: rgba(0, 0, 0, .7);
    color: #fff;
    box-sizing: border-box;
    padding: 10px 12px;
  }

  .video-status {
    display: flex;
    padding: 0 5px;
    box-sizing: border-box;
    align-items: center;
    flex: 1;
  }
  
  .video-status .total-time {
    box-sizing: border-box;
    position: relative;
    margin: 0 15px;
    width: 100%;
    height: 5px;
    border-radius: 2px;
    background: rgba(255, 255, 255, .3)
  }
  
  .video-status .current-time {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    display: block;
    background: #fff;
  }

  .video-status .time-slider {
    z-index: 299;
    border-radius: 50%;
    position: absolute;
    width: 15px;
    height: 15px;
    top: 50%;
    background: #fff;
    transform: translateY(-50%);
  }

  .video-status .time {
    display: inline-block;
    min-width: 32px;
    font-size: 12px;
    font-weight: 100;
  }

  .video-play-control {
    // position: absolute;
    // bottom: 0;
    // left: 0;
  }
`

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

    this.setupStyle()
    this.setupControls()
    this.setupWrapper()
    this.setupTime()
    this.setupVideo()
    this.setupSlider()
    this.setupListeners()
    this.update()
  }

  // 有时间再配置成css modules
  setupStyle() {
    const style = document.createElement('style')
    style.innerHTML = cssRules
    document.getElementsByTagName('head')[0].appendChild(style)
  }

  setupControls() {
    this.playButton = document.createElement('div')
    this.playButton.className = 'video-play-control'
    this.playButton.addEventListener('click', () => {
      this.userPlay = true
      // ios中第一次手动触发play方法无效
      this.isplaying = !this.isplaying
      if(this.isplaying) this.video.play()
      else this.video.pause()
    })

    this.timeStatus = document.createElement('div')
    this.timeStatus.className = 'video-status'

    this.fullScreenButton = document.createElement('div')
    this.fullScreenButton.innerHTML = '全屏'

    const self = this
    this.fullScreenButton.addEventListener('click', function() {
      if(self.video.requestFullscreen) self.video.requestFullscreen()
      else if(self.video.webkitEnterFullScreen) self.video.webkitEnterFullScreen()
      else if(self.video.webkitRequestFullscreen) self.video.webkitRequestFullscreen()
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
    addChild(this.total, this.current, this.slider)

    addChild(this.timeStatus, this.startTime, this.total, this.endTime)
  }

  setupSlider() {
    this.slider.addEventListener('touchstart', (evt) => {
      this.startX = evt.touches[0].pageX
      this.startTimeFrom = this.timeFrom
    })

    this.slider.addEventListener('touchmove', (evt) => {
      console.log(this.startX)
      const delta = (evt.touches[0].pageX - this.startX) / this.rect.width * this.timeTo
      this.timeFrom = this.startTimeFrom + delta
    })

    this.slider.addEventListener('touend', () => {} )
  }

  select() {

  }

  setupWrapper() {
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'video-wrapper'

    this.controls = document.createElement('div')
    this.controls.className = 'video-controls'

    addChild(this.controls, this.playButton, this.timeStatus, this.fullScreenButton)
    this.container.appendChild(this.wrapper)
    addChild(this.wrapper, this.controls)
  }

  update = () => {
    requestAnimationFrame(this.update)
    if(!this.userPlay) {
      if(this.isplaying) this.video.play()
      else this.video.pause()
    }
    // 暂不考虑使用图标
    this.playButton.innerHTML = this.isplaying ? '暂停' : '播放'
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

  setupVideo() {
    const { src, poster } = this.options
    this.video = document.createElement('video')
    this.video.className = 'video'
    setAttributes(this.video, {
      // poster,
      src,
      'webkit-playsinline': true,
      'playsinline': true,
      'preload': 'metadata',
      'crossOrigin': true,
      // 'controls': 'controls',
    })
    this.wrapper.appendChild(this.video)
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
      this.onpreviewended({})
    }
  }

  onloadedmetadata = (evt) => {
    // 设置currentTime=0可以让没有封面的视频显示第一帧
    evt.target.currentTime = 0
    this.timeFrom = 0
    this.endTime.innerHTML = this._timeTo 
  }

  onpause(e) {
    // const { onpause } = this.options
    // this.video.onpause = onpause
  }

  onpreviewended = (evt) => {

  }
}