import { prop, Ref, Typegoose, arrayProp, pre, post, DocumentType, getModelForClass, ReturnModelType } from "@typegoose/typegoose";
import { Artist } from "./artist.model";
import { SpotifyService, KeyTypes, Types } from "../Services/spotify.service";
import { createHash } from "crypto";
import { writeFileSync } from "fs";
@post<Album>("init", (album) => {
	if (album.picture && !album.picture.includes("http")) {
		album.picture = `${process.env.HOST}${album.picture}`;
	}
})
export class Album {
	public static async random(this: ReturnModelType<typeof Album>, limit: number = 10, min: number = 0) {
		const total = await this.estimatedDocumentCount();

		const data = [];

		for (let i = 0; i < limit; i++) {
			const skip = Math.floor(Math.random() * (total - min + 1)) + min;
			const doc = await this.findOne().populate("artist").skip(skip).limit(1);

			if (doc) {
				data.push(doc);
			}
		}

		return data;
	}

	public static async findOrCreate(this: ReturnModelType<typeof Album>, data: {
		album: string, artist: { name: string, id: any }, artists: any[], year: number, picture: Buffer | false | string,
	}) {
		let album = await this.findOne({ name: data.album });

		if (!album) {
			if (data.picture) {
				const id = createHash("md5").update(`${data.artist.id}-${data.album}`).digest("hex");
				writeFileSync(`${process.env.ART_PATH}/${id}`, data.picture);
				data.picture = `/albums/art/${id}`;
			} else {
				data.picture = await SpotifyService.instance.picture(Types.ALBUM, KeyTypes.ALBUMS, `album:${data.album} artist:${data.artist.name}`);
			}

			album = await this.create({
				name: data.album,
				year: data.year || 0,
				artist: data.artist.id,
				artists: data.artists,
				created_at: new Date(),
				picture: data.picture,
			});
		}

		return album;
	}

	@prop()
	public name: string;

	@prop({ ref: Artist })
	public artist: Ref<Artist>;

	@arrayProp({ itemsRef: Artist })
	public artists: Ref<Artist[]>;

	@prop()
	public picture: string;

	@prop()
	public year: number;

	@prop()
	public created_at: Date = new Date();

}

export const AlbumModel = getModelForClass(Album);
