export function randomData(col, row) {
	var data = [];
	for(var i = 0; i < col; i++) {
		var column = [];
		for(var j = 0; j < row; j++) {
			column.push({val:Math.floor(Math.random()*100)});
		}
		data.push(column);
	}
	return data;
}