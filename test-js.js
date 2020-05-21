let template = '你好，我们公司是{{ company }}，我们属于{{group.name}}业务线，我们在招聘各种方向的人才，包括{{group.jobs[0]}}、{{group["jobs"][1]}}等。';
let obj = {
    group: {
        name: '天猫',
        jobs: ['前端']
    },
    company: '阿里'
}


function _getValueRecur (key, obj) {
	if (key in obj) {
    	return obj[key]
    }
  	const reg = /(\w+)(\.|\[)/
    const match = key.match(reg)
    console.log(match)
    if (match) {
    }
}


function render (template, obj) {
  // 代码实现
  const reg = /{{\s*([^{{}}]+)\s*}}/g
  template.replace(reg, (match, $1, idx) => {
    console.log(idx)
  })
}

render(template, obj)
