var _width = $(window).width();
var _height = $(window).height();
var width = _width;
var height = _height;

var data = null;
var data_file_si = "./data/si_data.json";
var data_file_fu = "./data/fu_data.json";
var data_file_xian = "./data/xian_data.json";

var fontFamily;

function setUi() {
	// 设置字体
	var ua = navigator.userAgent.toLowerCase();
	fontFamily = "楷体";
	if (/\(i[^;]+;( U;)? CPU.+Mac OS X/gi.test(ua)) {
		fontFamily = "PingFangSC-Regular";
	}
	d3.select("body").style("font-family", fontFamily);
}

function treemap(data, width, height) {
	// Simple Treemap
	// 输入：数据，画布宽高
	// 输出：叶节点的位置及大小

	// 存放叶节点的数组
	var leaves = [];

	function calcPos(node, x, y, width, height, parent) {
		var rects = [];
		var rwidth = width,
			rheight = height;

		function worst(row, w) {
			if (row.length == 0) {
				return Infinity;
			}

			var rmax = 0,
				rmin = Infinity,
				s = 0;
			for (var i in row) {
				var r = row[i].value * 125;
				s += r;
				if (r > rmax) rmax = r;
				if (r < rmin) rmin = r;
			}
			var pw = w * w,
				ps = s * s;
			return Math.max((pw * rmax) / ps, ps / (pw * rmin));
		}

		function layoutrow(row, w) {
			var lx = width - rwidth,
				ly = height - rheight;
			var direction; // 0: horizontal;  1: vertical

			var sum = 0;
			for (var i in row)
				sum += row[i].value * 125;
			var ext = sum / w;
			if (Math.abs(w - rwidth) <= 1e-6) {
				rheight -= ext;
				direction = 0;
			} else {
				rwidth -= ext;
				direction = 1;
			}

			for (var i in row) {
				if (direction == 0) {
					var hh = ext,
						ww = row[i].value * 125 / ext;
					var node = {
						x: lx,
						y: ly,
						width: ww,
						height: hh,
					};
					rects.push(node);
					lx += ww;
				} else {
					var ww = ext,
						hh = row[i].value * 125 / ext;
					var node = {
						x: lx,
						y: ly,
						width: ww,
						height: hh,
					};
					rects.push(node);
					ly += hh;
				}
			}
		}

		function squarify(children, row, w) {
			if (children.length == 0) {
				if (row.length != 0) layoutrow(row, w);
				return;
			}

			var node = children[0];
			var [...newrow] = row;
			newrow.push(node);

			if (worst(row, w) >= worst(newrow, w)) {
				var [...tmp] = children
				tmp.shift();
				squarify(tmp, newrow, w);
			} else {
				layoutrow(row, w);
				squarify(children, [], Math.min(rwidth, rheight));
			}
		}

		var children = node.children;
		squarify(children, [], Math.min(rwidth, rheight));
		for (var i in children) {
			var child_node = children[i];
			if (child_node.children == undefined) {
				var leaf = {
					name: child_node.name,
					value: child_node.value,
					x: x + rects[i].x,
					y: y + rects[i].y,
					width: rects[i].width,
					height: rects[i].height,
					parent: parent == -1 ? child_node.name : parent.name,
				};
				leaves.push(leaf);
			} else {
				calcPos(
					child_node,
					x + rects[i].x,
					y + rects[i].y,
					rects[i].width,
					rects[i].height,
					parent == -1 ? child_node : parent
				)
			}
		}

	}

	calcPos(data, 0, 0, width, height, -1);

	return leaves;
}

function _treemap(data, width, height) {
	// Simple Treemap
	// 输入：数据，画布宽高
	// 输出：叶节点的位置及大小

	// 补充非叶节点的数量信息
	function getValue(node) {
		if (node.children == null) return;
		let value = 0;
		for (let i in node.children) {
			let n = node.children[i];
			getValue(n);
			value += n.value;
		}
		node.value = value;
	}
	getValue(data);

	// 存放叶节点的数组
	let leaves = [];

	// 计算叶节点位置
	// 保留第一层信息，方便染色
	function calcPos(node, x, y, width, height, direction, parent) {
		console.log(x, y, width, height);
		if (node.children == null) {
			let leaf = {
				name: node.name,
				value: node.value,
				x: x,
				y: y,
				width: width,
				height: height,
				parent: parent == -1 ? node.name : parent.name,
			};
			leaves.push(leaf);
			return;
		}

		// 比例尺
		let scale;
		// 横向
		if (direction == 1)
			scale = d3.scaleLinear().domain([0, node.value]).range([0, width]);
		// 纵向
		else scale = d3.scaleLinear().domain([0, node.value]).range([0, height]);

		let totValue = 0;
		for (let i in node.children) {
			let n = node.children[i];
			let value = n.value;
			if (direction == 1)
				calcPos(
					n,
					x + scale(totValue),
					y,
					scale(value),
					height,
					direction ^ 1,
					parent == -1 ? n : parent
				);
			else
				calcPos(
					n,
					x,
					y + scale(totValue),
					width,
					scale(value),
					direction ^ 1,
					parent == -1 ? n : parent
				);
			totValue += value;
		}
	}
	calcPos(data, 0, 0, width, height, 1, -1);

	return leaves;
}

function drawTreemap(tag) {
	// 计算布局
	// console.log(data);
	// var leaves = treemap(data, width, height);
	// var leaves = treemap(data, 1397.19, 684.323);
	// var leaves = treemap(data, 1411.6, 1000);
	// var f = 4/9;
	// var leaves = treemap(data, 1568+f, 900);
	// var leaves = treemap(data, 1764.5, 800);
	var leaves = treemap(data, 1764.5, 1000);
	// console.log(leaves);

	// 绘制
	var svg = d3
		.select(tag)
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	// 定义颜色比例尺
	// var color = d3.scaleOrdinal(d3.schemeCategory10)
	var color = d3.scaleOrdinal(["dodgerBlue", "orange", "greenyellow", "tomato", "purple", "chocolate", "hotpink",
		"olive", "gold", "gray", "aqua", "violet", "yellow", "dimGray", "green", "indigo", "crimson",
		"royalblue"
	]);


	const leaf = svg
		.selectAll("g")
		.data(leaves)
		.join("g")
		.attr("transform", (d) => `translate(${d.x},${d.y})`);

	// 矩形
	leaf
		.append("rect")
		.attr("id", (d) => d.name)
		.attr("stroke", "white")
		.attr("stroke-width", 1)
		.attr("fill", (d) => color(d.parent))
		.attr("fill-opacity",
			function(d) {
				var op = d.value;
				if (op > 400)
					op = 400;
				op = Math.sqrt(op) * 20;
				return op / 500 * 0.7 + 0.3;
			})
		.attr("width", (d) => d.width)
		.attr("height", (d) => d.height);

	// 交互
	svg
		.selectAll("rect")
		.on("mouseover", function(d, i) {
			d3
				.select(this)
				.attr("fill-opacity", 0.1)
		})
		.on("mouseout", function(d, i) {
			d3
				.select(this)
				.transition()
				.duration(0)
				.attr("fill-opacity",
					function(d) {
						var op = d.value;
						if (op > 400)
							op = 400;
						op = Math.sqrt(op) * 20;
						return op / 500 * 0.7 + 0.4;
					})
		})
		.on("click", function(d, i) {
			alert("行政区划：" + i.name + "\n进士人数：" + i.value.toString());
		})

	// 文字
	leaf
		.append("text")
		.selectAll("tspan")
		.data((d) => (d.name + d.value.toString()).split(/(?=[A-Z][a-z])|\s+/g))
		.join("tspan")
		.attr("x", 3)
		.attr(
			"y", (d, i, nodes) =>
			`${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`
		)
		.attr("fill-opacity", (d, i, nodes) =>
			i === nodes.length - 1 ? 0.7 : null
		)
		.attr("font-size",
			function(d) {
				var str = d.slice(2);
				if (str[0] < "0" || str[0] > "9")
					str = str.slice(1);
				var v = parseInt(str);
				v = Math.round(v / 10) + 5;
				if (v > 20)
					v = 20;
				return `${v}px`;
			}
		)
		.text((d) => d);
}

function main() {
	setUi();
	d3.json(data_file_si).then(function(DATA) {
		data = DATA;
		drawTreemap("#si_treemap");
	});
	d3.json(data_file_fu).then(function(DATA) {
		data = DATA;
		drawTreemap("#fu_treemap");
	});
	d3.json(data_file_xian).then(function(DATA) {
		data = DATA;
		drawTreemap("#xian_treemap");
	});
}

main();
