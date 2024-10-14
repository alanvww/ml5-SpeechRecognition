let memos = [];

new p5((p) => {
	p.setup = () => {
		let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
		canvas.position(0, 0);
		canvas.style('z-index', '-1');
		p.textAlign(p.CENTER, p.CENTER);
		p.textSize(16);
	};

	p.draw = () => {
		p.background(240);
		memos.forEach((memo) => {
			p.fill(memo.color.r, memo.color.g, memo.color.b);
			p.text(memo.text, memo.x, memo.y);
		});
	};

	p.windowResized = () => {
		p.resizeCanvas(p.windowWidth, p.windowHeight);
	};
});

function addMemoToCanvas(text) {
	const x = Math.random() * window.innerWidth;
	const y = Math.random() * window.innerHeight;
	const color = {
		r: Math.random() * 256,
		g: Math.random() * 256,
		b: Math.random() * 256,
	};
	memos.push({ text, x, y, color });
}

// Expose the addMemoToCanvas function globally
window.addMemoToCanvas = addMemoToCanvas;