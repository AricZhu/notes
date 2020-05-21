var opt = {
  name:"Amy",
  name2: this.name,
  say:function(){
      return this.name;
  },
  say2:function(){
      setTimeout(function(){
          console.log(this.name);
      })
  },
  say3:function(){
      setTimeout(() => {
          console.log(this.name);
      })
  }
}

console.log(opt.name2); //1. 这里打印出什么？-- "Amy"
console.log(opt.say); //2. 这里打印出什么？  -- function () {return this.name} 
opt.say2(); //3. 这里打印出什么？            -- undefined
opt.say3(); //4. 这里打印出什么？            -- "Amy"
