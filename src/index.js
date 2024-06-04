import React from "react";
import { PanResponder, View, StyleSheet, Animated, Dimensions, LayoutAnimation, TouchableOpacity } from "react-native";
import PropTypes from "prop-types";
import styles from "./styles";
import { rotateX, rotateY, transformOrigin } from "./transform-utils";
import renderVerticalPage from "./vertical-page";
import renderHorizontalPage from "./horizontal-page";

class FlipPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      angle: 0,
      page: props.initialPage || 0,
      halfHeight: 0,
      halfWidth: 0,
      shouldGoNext: false,
      shouldGoPrevious: false,
      direction: "",
      animating: false,
      scale: new Animated.Value(1),
      prevDistance: 0,
      animatedStyle: {},
      allowZoom: true,
      offsetX: new Animated.Value(0),
      offsetY: new Animated.Value(0),
      lastX: 0,
      lastY: 0,
      gestureX: 0,
      gestureY: 0,
    };

    this.firstHalves = [];
    this.secondHalves = [];
    this.touchDistance = null;
    this.scaleRef = 1;
    this.windowWidth = Dimensions.get('window').width;
    this.windowHeight = Dimensions.get('window').height;
    this.animatedStyle = {}
    this.initialHeader = this.props.initialHeader;
    this.tapCount = 0;
    this.lastTapRef = null;
    this.doubleTap = false;
    this.tapTimeout = null;
    this.zoomIn = false;
    this.zoomOut = true;

    this.tapX = 0;
    this.tapY = 0;
    this.lastTapX = 0;
    this.lastTapY = 0;

    this.onLayout = this.onLayout.bind(this);
    this.renderPage = this.renderPage.bind(this);
  }

  UNSAFE_componentWillMount() {
    this.panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        const touches = evt?.nativeEvent?.touches;

        const windowHeigthCenter  = this.windowHeight / 2;
        const windowWidthCenter = this.windowWidth / 2;
        const scaledImageHeightCenter = (this.props.imgHeight * this.scaleRef) / 2;
        const scaledImageWidthCenter = (this.windowWidth * this.scaleRef) / 2;
        const maximumYTranslate = scaledImageHeightCenter - windowHeigthCenter;
        const maximumXTranslate = scaledImageWidthCenter - windowWidthCenter;

        const checkFinalCondition = Math.abs(dx) >= 1 && Math.abs(dy) >= 1;
        const allowVerticalTranslation = Math.abs(this.state.lastY + dy) < Math.abs(maximumYTranslate); 
        const allowHorizontalTranslation = Math.abs(this.state.lastX + dx) < Math.abs(maximumXTranslate); 

        if (touches.length >= 2) {
          const touch1 = { x: touches[0]?.pageX, y: touches[0]?.pageY };
          const touch2 = { x: touches[1]?.pageX, y: touches[1]?.pageY };
          const distance = this.calculateDistance(touch1, touch2);
          this.setState({
            prevDistance: distance,
          });
        }
        return true;
        if (touches?.length == 1) return ((allowHorizontalTranslation || allowVerticalTranslation) && checkFinalCondition) || this.allowZoom;
        return checkFinalCondition || this.state.allowZoom
      },
      onPanResponderGrant: (evt, gestureState) => {
        this.setState({
          offsetX: this.state.lastX,
          offsetY: this.state.lastY,
        })
        const touches = evt?.nativeEvent?.touches;
        // this is to calc tapping difference
        const xDiff = Math.abs(this.lastTapX - touches?.[0]?.locationX);
        const yDiff = Math.abs(this.lastTapY - touches?.[0]?.locationY);
        if(touches?.length == 1) {
          const xDiff = Math.abs(this.lastTapX - touches?.[0]?.locationX);
          const yDiff = Math.abs(this.lastTapY - touches?.[0]?.locationY);
          const now = Date.now();
          const DOUBLE_TAP_DELAY = 300;

          if (this.lastTapRef && (now - this.lastTapRef) < DOUBLE_TAP_DELAY && (xDiff < 20 && yDiff < 20)) {
            // Double tap detected
            this.lastTapRef = null;
            if (this.scaleRef > 1) {
              this.zoomIn = false;
              this.zoomOut = true;

              this.scaleRef = 1;
              this.animatedStyle = {
              }
              this.setState({
                animatedStyle: {
                  transform: [
                    { scale: this.scaleRef }
                  ]
                },
                scale: this.scaleRef,
              });
              setTimeout(() => {
                this.allowZoom = true;
              }, 500);

            } else {
              this.zoomIn = true;
              this.zoomOut = false;


              this.scaleRef = 3;
              this.animatedStyle = {
                transform: [
                  { scale: this.scaleRef },
                ]
              }

              const xCenter = this.windowWidth / 2;
              const yCenter = this.props.imgHeight / 2;

              const isLeftX = touches?.[0]?.pageX > xCenter;
              const isUpperY = touches?.[0]?.pageY > yCenter;

              const xAdjustment = (xCenter - touches?.[0]?.pageX) / this.scaleRef;
              const yAdjustment = (yCenter - touches?.[0]?.pageY) / this.scaleRef;

              const xLeft = xCenter - touches?.[0]?.locationX - xAdjustment;
              const xRight = xCenter - touches?.[0]?.locationX - xAdjustment;

              const yUpper = yCenter - touches?.[0]?.locationY - yAdjustment;
              const yLower = yCenter - touches?.[0]?.locationY - yAdjustment;

              const x = isLeftX ? xLeft : xRight;
              const y = isUpperY ? yUpper : yLower;

              this.tapX = x;
              this.tapY =  y;

              this.setState({
                lastX: x,
                lastY: y,
                gestureX: gestureState?.dx,
                gestureY: gestureState?.dy,
                offsetX: this.tapX * this.scaleRef,
                offsetY: this.tapY * this.scaleRef,
                // gestureX: xLeft,
                // gestureY: yLower,
                // offsetX: this.state.lastX + xLeft,
                // offsetY: this.state.lastY + yLower,
                animatedStyle: {
                  transform: [
                    { scale: this.scaleRef },
                    {translateX: x},
                    {translateY: y},
                  ]
                },
                scale: this.scaleRef,
              });
              setTimeout(() => {
                this.allowZoom = false;
              }, 500);
            }
            this.lastTapX = 0;
            this.lastTapY = 0;
          } else {
            this.lastTapRef = now;
            this.lastTapX = touches?.[0]?.locationX;
            this.lastTapY = touches?.[0]?.locationY;
          }
        };
        
        // this.props.disableHeader && this.props.disableHeader();
      },
      onPanResponderMove: this.handlePanResponderMove.bind(this),
      onPanResponderRelease: this.handlePanResponderStop.bind(this),
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.initialPage !== this.props.initialPage) {
      // Handle the change in the value of initialPage here
      this.setState({
        page: this.props.initialPage || 0,
      });
    }
  }

  lastPage() {
    return this.props.children.length - 1;
  }

  isOnFirstPage() {
    return this.state.page === 0;
  }

  isOnLastPage() {
    return this.state.page === this.lastPage();
  }

  rotateFirstHalf(angle) {
    const { halfHeight, halfWidth, page } = this.state;
    const { orientation } = this.props;
    const firstHalf = this.firstHalves[page];

    let matrix = orientation === "vertical" ? rotateX(angle) : rotateY(angle);
    const origin =
      orientation === "vertical"
        ? { x: 0, y: halfHeight / 2, z: 0 }
        : { x: halfWidth / 2, y: 0, z: 0 };
      this.allowZoom && transformOrigin(matrix, origin);
      this.allowZoom &&firstHalf.setNativeProps({
      transform: [{ matrix }, { perspective: 100000 }],
    });
  }

  rotateSecondHalf(angle) {
    const { halfHeight, halfWidth, page } = this.state;
    const { orientation } = this.props;
    const secondHalf = this.secondHalves[page];

    let matrix = orientation === "vertical" ? rotateX(angle) : rotateY(angle);
    const origin =
      orientation === "vertical"
        ? { x: 0, y: -halfHeight / 2, z: 0 }
        : { x: -halfWidth / 2, y: 0, z: 0 };
      this.allowZoom && transformOrigin(matrix, origin);
      this.allowZoom && secondHalf.setNativeProps({
      transform: [{ matrix }, { perspective: 100000 }],
    });
  }

  calculateDistance = (touch1, touch2) => {
    const dx = touch2.x - touch1.x;
    const dy = touch2.y - touch1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  handlePanResponderMove(e, gestureState) {
    const { dx, dy, numberActiveTouches } = gestureState;
    const { direction } = this.state;
    const { orientation, loopForever, reverse } = this.props;
    const dn = orientation === "vertical" ? dy : dx;
    const touches = e.nativeEvent.touches;

    if (this.allowZoom && this.zoomOut && numberActiveTouches == 1 && this.scaleRef == 1) {
      this.animatedStyle = {}
      this.scaleRef = 1;
      this.setState({
        animatedStyle: {
        }
      })
      this.setState({
        lastX: 0,
        lastY: 0,
        offsetX: 0,
        offsetY: 0,
        gestureX: 0,
        gestureY: 0,
      })

      if (this.allowZoom && this.scaleRef == 1) {
        let angle = (dn / 250) * 180;

      if (angle < 0) {
        angle = Math.max(-180, angle);
      } else {
        angle = Math.min(180, angle);
      }

      let nextDirection = direction;
      if (reverse) {
        if (dn < 0 && direction === "") {
          nextDirection = orientation === "vertical" ? "top" : "left";
        } else if (dn > 0 && direction === "") {
          nextDirection = orientation === "vertical" ? "bottom" : "right";
        }
        this.setState({ direction: nextDirection });
        if (dn < 0 && (nextDirection === "top" || nextDirection === "left")) {
          if (this.isOnFirstPage() && !loopForever) {
            angle = Math.max(angle, -30);
          }
          this.rotateSecondHalf(angle);
          this.setState({
            angle,
          });
        } else if (
          dn > 0 &&
          (nextDirection === "bottom" || nextDirection === "right")
        ) {
          if (this.isOnLastPage() && !loopForever) {
            angle = Math.min(angle, 30);
          }
          this.rotateFirstHalf(angle);
          this.setState({
            angle,
          });
        }
      } else {
        if (dn < 0 && direction === "") {
          nextDirection = orientation === "vertical" ? "top" : "left";
        } else if (dn > 0 && direction === "") {
          nextDirection = orientation === "vertical" ? "bottom" : "right";
        }
        this.setState({ direction: nextDirection });
        if (dn < 0 && (nextDirection === "top" || nextDirection === "left")) {
          if (this.isOnLastPage() && !loopForever) {
            angle = Math.max(angle, -30);
          }
          this.rotateSecondHalf(angle);
          this.setState({
            angle,
          });
        } else if (
          dn > 0 &&
          (nextDirection === "bottom" || nextDirection === "right")
        ) {
          if (this.isOnFirstPage() && !loopForever) {
            angle = Math.min(angle, 30);
          }
          this.rotateFirstHalf(angle);
          this.setState({
            angle,
          });
        }
      }
      }
    }

    if (touches?.length >= 2 && !this.state.direction) {
      const touch1 = { x: touches[0].pageX, y: touches[0].pageY };
      const touch2 = { x: touches[1].pageX, y: touches[1].pageY };
      const distance = this.calculateDistance(touch1, touch2);
      const scaleFactor = this.scaleRef * (distance / this.state.prevDistance);
      this.scaleRef = scaleFactor <= 1 ? 1 : scaleFactor >= 3 ? 3 : scaleFactor;
     
      if (this.scaleRef > 1) {
        LayoutAnimation.easeInEaseOut();
        this.allowZoom = false;
        this.zoomOut = false;
      } else if (this.scaleRef <= 1) {
        LayoutAnimation.easeInEaseOut();
        setTimeout(() => {
          this.allowZoom = true;
          this.zoomOut = true;
        }, 500);
        this.setState({
          lastX: 0,
          lastY: 0,
          offsetX: 0,
          offsetY: 0,
          gestureX: 0,
          gestureY: 0,
          scale: 1
        })
      }
      this.setState({
        prevDistance: distance
      })
    }

    const windowHeigthCenter  = this.windowHeight / 2;
    const windowWidthCenter = this.windowWidth / 2;
    const scaledImageHeightCenter = (this.props.imgHeight * this.scaleRef) / 2;
    const scaledImageWidthCenter = (this.windowWidth * this.scaleRef) / 2;
    const maximumYTranslate = scaledImageHeightCenter - windowHeigthCenter;
    const maximumXTranslate = scaledImageWidthCenter - windowWidthCenter;

    const allowVerticalTranslation = Math.abs(this.state.lastY + dy) < Math.abs(maximumYTranslate); 
    const allowHorizontalTranslation = Math.abs(this.state.lastX + dx) < Math.abs(maximumXTranslate); 

    const xCenter = this.windowWidth / 2;
    const yCenter = this.props.imgHeight / 2;

    const isLeftX = touches?.[0]?.pageX > xCenter;
    const isUpperY = touches?.[0]?.pageY > yCenter;

    const xAdjustment = (xCenter - touches?.[0]?.pageX) / this.scaleRef;
    const yAdjustment = (yCenter - touches?.[0]?.pageY) / this.scaleRef;

    const xLeft = xCenter - touches?.[0]?.locationX - xAdjustment;
    const xRight = xCenter - touches?.[0]?.locationX - xAdjustment;

    const yUpper = yCenter - touches?.[0]?.locationY - yAdjustment;
    const yLower = yCenter - touches?.[0]?.locationY - yAdjustment;

    const x = isLeftX ? xLeft : xRight;
    const y = isUpperY ? yUpper : yLower;

    if (!this.allowZoom && touches?.length == 2 && !this.state.direction) {
        if (allowHorizontalTranslation && allowVerticalTranslation && !this.state.direction && this.scaleRef > 1) {
          this.setState({
            gestureX: gestureState.dx,
            gestureY: gestureState.dy,
            offsetX: this.state.lastX + gestureState.dx,
            offsetY: this.state.lastY + gestureState.dy,
            animatedStyle: {
              transform: [
                { translateX: this.state.lastX + gestureState.dx },
                { translateY: this.state.lastY + gestureState.dy },
                { scale: this.scaleRef }
              ]
            },
            scale: this.scaleRef,
          });
        } else if (allowHorizontalTranslation && !this.state.direction && this.scaleRef > 1) {
          this.setState({
            gestureX: gestureState.dx,
            gestureY: gestureState.dy,
            offsetX: this.state.lastX + gestureState.dx,
            offsetY: this.state.lastY + gestureState.dy,
            animatedStyle: {
              transform: [
                { translateX: this.state.lastX + gestureState.dx },
                { translateY: this.state.lastY + gestureState?.dy > 0 ? maximumYTranslate : -maximumYTranslate },
                { scale: this.scaleRef }
              ]
            },
            scale: this.scaleRef,
          });
        } else if (allowVerticalTranslation && !this.state.direction && this.scaleRef > 1) {
          this.setState({
            gestureX: gestureState.dx,
            gestureY: gestureState.dy,
            offsetX: this.state.lastX + gestureState.dx,
            offsetY: this.state.lastY + gestureState.dy,
            animatedStyle: {
              transform: [
                { translateX: this.state.lastX + gestureState?.dx > 0 ? maximumXTranslate : -maximumXTranslate},
                { translateY: this.state.lastY + gestureState.dy },
                { scale: this.scaleRef }
              ]
            },
            scale: this.scaleRef,
          });
        }
    }

    // console.log("values: ", this.state.lastX + gestureState.dx, x * this.scaleRef);
    // console.log(allowVerticalTranslation, this.state.lastX + gestureState?.dx > 0 ? maximumXTranslate : -maximumXTranslate)

    // console.log("tapX is: ", this.tapX, gestureState?.dx, this.state.lastX);
    // console.log("touches are: ", this.tapX - dx);

    if (!this.allowZoom && touches?.length == 1 && !this.state.direction) {
      if (allowHorizontalTranslation && allowVerticalTranslation && !this.state.direction && this.scaleRef > 1) {
       
        this.setState({
          gestureX: gestureState.dx,
          gestureY: gestureState.dy,
          offsetX: this.state.lastX + gestureState.dx,
          offsetY: this.state.lastY + gestureState.dy,
          animatedStyle: {
            transform: [
              { translateX: this.state.lastX + gestureState.dx },
              { translateY: this.state.lastY + gestureState.dy },
              { scale: this.scaleRef }
            ]
          },
          scale: this.scaleRef,
        });
      } else if (allowHorizontalTranslation && !this.state.direction && this.scaleRef > 1) {
        this.setState({
          gestureX: gestureState.dx,
          gestureY: gestureState.dy,
          offsetX: this.state.lastX + gestureState.dx,
          offsetY: this.state.lastY + gestureState?.dy,
          animatedStyle: {
            transform: [
              { translateX: this.state.lastX + gestureState.dx },
              { translateY: this.state.lastY + gestureState?.dy > 0 ? maximumYTranslate : -maximumYTranslate },
              { scale: this.scaleRef }
            ]
          },
          scale: this.scaleRef,
        });
      } else if (allowVerticalTranslation && !this.state.direction && this.scaleRef > 1) {
        this.setState({
          gestureX: gestureState.dx,
          gestureY: gestureState.dy,
          offsetX: this.state.lastX + gestureState.dx,
          offsetY: this.state.lastY + gestureState?.dy ,
          animatedStyle: {
            transform: [
              { translateX: this.state.lastX + gestureState?.dx > 0 ? maximumXTranslate : -maximumXTranslate},
              { translateY: this.state.lastY + gestureState.dy },
              { scale: this.scaleRef }
            ]
          },
          scale: this.scaleRef,
        });
      }
    }

    if (this.state.animating) {
      return;
    }

  }

  resetHalves() {
    const { loopForever, children } = this.props;
    const pages = children.length;
    const { angle, direction, shouldGoNext, shouldGoPrevious, page } =
      this.state;

    const firstHalf = this.firstHalves[page];
    const secondHalf = this.secondHalves[page];

    const finish = () => {
      const { onFinish } = this.props;
      const { direction } = this.state;
      this.setState({ direction: "" });

      this.state.animating = true;

//Timeout to prevent the page from flipping back immediately
      setTimeout(() => {
        this.state.animating = false;
      }, 500);

      if (shouldGoNext) {
        this.setState(
          {
            angle: 0,
            page: loopForever && this.isOnLastPage() ? 0 : page + 1,
          },
          () => {
            this.allowZoom && this.props.onPageChange(this.state.page, "next");
            this.allowZoom && firstHalf.setNativeProps({ transform: [] });
            this.allowZoom && secondHalf.setNativeProps({ transform: [] });
          }
        );
      } else if (shouldGoPrevious) {
        this.setState(
          {
            angle: 0,
            page: loopForever && this.isOnFirstPage() ? pages - 1 : page - 1,
          },
          () => {
            this.allowZoom && this.props.onPageChange(this.state.page, "prev");
            this.allowZoom && firstHalf.setNativeProps({ transform: [] });
            this.allowZoom && secondHalf.setNativeProps({ transform: [] });
          }
        );
      } else {
        if (typeof onFinish === "function") {
          onFinish(direction);
        }
      }
    };

    // Already swiped all the way
    if (Math.abs(angle) === 180) {
      finish();
      return;
    }

    let targetAngle;
    if (angle < -90) {
      targetAngle = -180;
    } else if (angle > 90) {
      targetAngle = 180;
    } else {
      targetAngle = 0;
    }

    this.resetTimer = setInterval(() => {
      let { angle } = this.state;

      angle += angle < targetAngle ? 5 : -5;

      if (angle < 0) {
        angle = Math.max(angle, -180);
      } else {
        angle = Math.min(angle, 180);
      }

      let matrix = rotateX(angle);

      if (angle < 0) {
        this.rotateSecondHalf(angle);
      } else {
        this.rotateFirstHalf(angle);
      }

      this.setState({ angle });

      if (
        (targetAngle < 0 && angle <= targetAngle) || // Flip second half to top
        (targetAngle === 0 && Math.abs(angle) <= 5) ||
        (targetAngle > 0 && angle >= targetAngle) // Flip first half to bottom
      ) {
        clearInterval(this.resetTimer);

        if (direction === "top" || direction === "left" || direction === "") {
          this.rotateSecondHalf(targetAngle);
        } else if (
          direction === "bottom" ||
          direction === "right" ||
          direction === ""
        ) {
          this.rotateFirstHalf(targetAngle);
        }

        finish();
      }
    }, 10);
  }

  handlePanResponderStop(e, gestureState) {
    const { dx, dy, numberActiveTouches } = gestureState;
    const { angle, page, direction } = this.state;
    const { orientation, reverse } = this.props;
    const dn = orientation === "vertical" ? dy : dx;
    const absAngle = Math.abs(angle);

    const windowHeigthCenter  = this.windowHeight / 2;
    const windowWidthCenter = this.windowWidth / 2;
    const scaledImageHeightCenter = (this.props.imgHeight * this.scaleRef) / 2;
    const scaledImageWidthCenter = (this.windowWidth * this.scaleRef) / 2;
    const maximumYTranslate = scaledImageHeightCenter - windowHeigthCenter;
    const maximumXTranslate = scaledImageWidthCenter - windowWidthCenter;

    const allowVerticalTranslation = Math.abs(this.state.lastY + dy) < Math.abs(maximumYTranslate); 
    const allowHorizontalTranslation = Math.abs(this.state.lastX + dx) < Math.abs(maximumXTranslate);
    
    if (this.zoomIn) {
      this.zoomIn = false
      this.allowZoom = false;
    };
    if (this.zoomOut) this.allowZoom = true;

    !this.allowZoom && !this.state.direction &&
    this.setState({
      lastX: allowHorizontalTranslation ? this.state.offsetX : this.state.offsetX < 0 ? -maximumXTranslate : maximumXTranslate,
      lastY: allowVerticalTranslation ? this.state.offsetY : this.state.offsetY < 0 ?  -maximumYTranslate : maximumYTranslate,
    });

    if (this.scaleRef == 1 && !this.state.direction) {
      // console.log('allowing zoom');
        setTimeout(() => {
          this.allowZoom = true;
          this.zoomOut = true;
          this.zoomIn = false;
        }, 500);
        this.setState({
          lastX: 0,
          lastY: 0,
          offsetX: 0,
          offsetY: 0,
          gestureX: 0,
          gestureY: 0,
      })
    }

    if (numberActiveTouches == 2 && !this.state.direction) {
      this.allowZoom = false;
      this.zoomOut = false;

      this.setState({
        lastX: 0,
        lastY: 0,
        offsetX: 0,
        offsetY: 0,
        gestureX: 0,
        gestureY: 0,
      })
    }

    if (dn === 0) {
      const { onPress } = this.props.children[page].props;
      if (typeof onPress === "function") {
        onPress();
      }
    }
    if (reverse) {
      this.setState(
        {
          shouldGoNext:
            absAngle > 90 && (direction === "top" || direction === "right"),
          shouldGoPrevious:
            absAngle > 90 && (direction === "bottom" || direction === "left"),
        },
        this.resetHalves
      );
    } else {
      this.setState(
        {
          shouldGoNext:
            absAngle > 90 && (direction === "top" || direction === "left"),
          shouldGoPrevious:
            absAngle > 90 && (direction === "bottom" || direction === "right"),
        },
        this.resetHalves
      );
    }

    this.scaleRef > 1 && this.props.setHeader && this.props.setHeader(false);
    this.scaleRef <= 1 && this.props.setHeader && this.props.setHeader(true);
    // this.props.setHeader && this.state.scale <= 1 && !this.state.direction &&  this.props.setHeader(this.initialHeader)
  }

  onLayout(e) {
    const { layout } = e.nativeEvent;
    const { width, height } = layout;
    const halfHeight = height / 2;
    const halfWidth = width / 2;

    this.setState({
      halfHeight,
      halfWidth,
    });
  }

  renderVerticalPage(previousPage, thisPage, nextPage, index) {
    const { angle, page, halfHeight, direction } = this.state;

    const height = { height: halfHeight * 2 };

    const absAngle = Math.abs(angle);

    const secondHalfPull = {
      marginTop: -halfHeight,
    };

    const setViewCallback = (view) => (this.firstHalves[index] = view);

    return renderVerticalPage(
      absAngle,
      page,
      halfHeight,
      direction,
      height,
      secondHalfPull,
      styles,
      index,
      this,
      previousPage,
      thisPage,
      nextPage
    );
  }

  renderHorizontalPage(previousPage, thisPage, nextPage, index) {
    const { angle, page, halfHeight, halfWidth, direction } = this.state;

    const width = { width: halfWidth * 2 };

    const absAngle = Math.abs(angle);

    const secondHalfPull = {
      marginLeft: -halfWidth,
    };

    return renderHorizontalPage(
      absAngle,
      page,
      halfWidth,
      direction,
      width,
      secondHalfPull,
      styles,
      index,
      this,
      previousPage,
      thisPage,
      nextPage,
      this.state.animatedStyle,
    );
  }

  renderPage(component, index) {
    const { children, orientation, loopForever, reverse } = this.props;
    const pages = children.length;

    const thisPage = component;
    let nextPage;
    let previousPage;
    if (reverse) {
      previousPage =
        index + 1 < pages
          ? children[index + 1]
          : loopForever
          ? children[0]
          : null;
      nextPage =
        index > 0
          ? children[index - 1]
          : loopForever
          ? children[pages - 1]
          : null;
    } else {
      nextPage =
        index + 1 < pages
          ? children[index + 1]
          : loopForever
          ? children[0]
          : null;
      previousPage =
        index > 0
          ? children[index - 1]
          : loopForever
          ? children[pages - 1]
          : null;
    }
    if (orientation === "vertical") {
      return this.renderVerticalPage(previousPage, thisPage, nextPage, index);
    } else {
      return this.renderHorizontalPage(previousPage, thisPage, nextPage, index);
    }
  }

  render() {
    const { children } = this.props;
    const { page, halfWidth, halfHeight } = this.state;
    const from = page > 0 ? page - 1 : 0;
    const to = from + 3;
    return (
      <View
        style={styles.container}
        {...this.panResponder.panHandlers}
        onLayout={this.onLayout}
      >
        {!!halfWidth &&
          !!halfHeight &&
          children
            .slice(from, to)
            .map((component, index) =>
              this.renderPage(component, from + index)
            )}
      </View>
    );
  }
}

FlipPage.propTypes = {
  orientation: PropTypes.oneOf(["horizontal", "vertical"]),
  loopForever: PropTypes.bool,
  onFinish: PropTypes.func,
  onPageChange: PropTypes.func,
  reverse: PropTypes.bool,
  initialPage: PropTypes.number,
  initialHeader: PropTypes.bool,
  setHeader: PropTypes.func,
  disableHeader: PropTypes.func,
  imgHeight: PropTypes.number,
};

FlipPage.defaultProps = {
  orientation: "vertical",
  loopForever: false,
  onFinish: null,
  onPageChange: () => {},
  reverse: false,
  initialPage: 0,
  initialHeader: false,
  setHeader: () => {},
  disableHeader: () => {},
  imgHeight: 0,
};

class FlipPagePage extends React.PureComponent {
  render() {
    const { children, style, onPress, initialHeader = false, setHeader = () => {},disableHeader = () => {} } = this.props;
    const defaultStyle = {
      backgroundColor: "#fff",
      height: "100%",
      width: "100%",
    };
    const finalStyle = Object.assign({}, defaultStyle, style);

    return <View style={finalStyle}>{children}</View>;
  }
}

export { FlipPage as default, FlipPagePage };
