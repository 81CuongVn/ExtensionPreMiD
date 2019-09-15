Vue.component("creditCard", {
  name: "creditcard",
  props: ["user"],
  data() {
    return {
      hovered: false,
      primary: tinycolor(this.$props.user.roleColor)
        .setAlpha(1)
        .darken(5)
        .toRgbString(),
      secondary: tinycolor(this.$props.user.roleColor)
        .analogous()[1]
        .setAlpha(0.5)
        .saturate(20)
        .toRgbString()
    };
  },
  template: `
  <div @mouseover="hovered = true" @mouseleave="hovered = false" class="credit-card" :style="'background: linear-gradient(165deg, '+this.primary+' 0%, '+this.secondary+' 100%); box-shadow: 0 2px 42px 0 '">
    <div class="credit-card__user">
      <h1 :title="user.name" v-text="user.name"/>
      <h2>{{ user.role }}</h2>
    </div>
    <div class="credit-card__avatar">
      <span :class="user.status"/>
      <img :src="user.avatar + '?size=40'" draggable="false">
    </div>
  </div>`
});
